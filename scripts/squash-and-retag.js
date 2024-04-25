const { execSync, spawn } = require('child_process');
const { Worker, isMainThread, workerData } = require('worker_threads');
const os = require('os');

const numCores = os.cpus().length;

async function runCommand(command, args = []) {
    return new Promise((resolve, reject) => {
        const proc = spawn(command, args, { shell: true });
        let output = '';
        proc.stdout.on('data', (data) => output += data);
        proc.stderr.on('data', (data) => console.error(data.toString()));
        proc.on('close', (code) => code === 0 ? resolve(output) : reject(new Error(`${command} exited with code ${code}`)));
    });
}

async function reapplyTags(tags) {
    if (isMainThread) {
        console.log(`Reapplying tags using ${numCores} cores...`);
        const segmentSize = Math.ceil(tags.length / numCores);
        const workers = [];

        for (let i = 0; i < numCores; i++) {
            const start = i * segmentSize;
            const end = Math.min(start + segmentSize, tags.length);
            const workerTags = tags.slice(start, end);

            if (workerTags.length) {
                const worker = new Worker(__filename, { workerData: { tags: workerTags } });
                const promise = new Promise((resolve, reject) => {
                    worker.on('message', message => console.log(message));
                    worker.on('error', reject);
                    worker.on('exit', code => code === 0 ? resolve() : reject(new Error(`Worker exited with code ${code}`)));
                });
                workers.push(promise);
            }
        }
        return Promise.all(workers);
    } else {
        workerData.tags.forEach(tag => {
            runCommand('git', ['tag', '-f', tag]);
        });
        parentPort.postMessage(`Reapplied ${workerData.tags.length} tags.`);
    }
}

async function squashCommits(baseBranch) {
    try {
        console.log('Starting the process to squash commits and manage tags...');
        // Fetch the latest state of the remote
        await runCommand('git', ['fetch']);

        // Determine the latest commit on the remote tracking branch
        const remoteBase = `origin/${baseBranch}`;
        const baseCommit = await runCommand('git', ['merge-base', 'HEAD', remoteBase]).then(output => output.trim());
        console.log(`Base commit: ${baseCommit}`);

        const tags = await runCommand('git', ['tag', '--sort=-creatordate']).then(output => output.trim().split('\n').filter(Boolean));
        console.log(`Collected tags: ${tags.length}`);

        // Reset to the base commit
        await runCommand('git', ['reset', '--soft', baseCommit]);
        await runCommand('git', ['commit', '-m', `"chore(release): release [skip ci]"`]);

        await reapplyTags(tags);

        // Push the squashed commit to the remote branch
        console.log('Pushing squashed commit to remote...');
        await runCommand('git', ['push', 'origin', `HEAD:${baseBranch}`, '--force']);

        // Push all tags
        console.log('Pushing all tags to remote...');
        await runCommand('git', ['push', 'origin', '--tags']);

        console.log('All tags have been reapplied and pushed.');
    } catch (error) {
        console.error('An error occurred:', error);
    }
}

if (isMainThread) {
    // Assuming the base branch is provided as a command-line argument
    const baseBranch = process.argv[2];  // Default to 'main' if no argument provided
    squashCommits(baseBranch);
}
