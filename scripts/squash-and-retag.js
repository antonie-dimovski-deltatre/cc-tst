const { execSync } = require("child_process");
const {
  Worker,
  isMainThread,
  parentPort,
  workerData,
} = require("worker_threads");
const os = require("os");

function runGitCommand(command) {
  try {
    return execSync(`git ${command}`, { encoding: "utf-8" }).trim();
  } catch (error) {
    console.error(`Failed to run command 'git ${command}': ${error}`);
    process.exit(1); // Exit if there's an error
  }
}

if (isMainThread) {
  const baseBranch = "main";
  const remote = "origin";

  // Fetch tags and latest changes from remote
  runGitCommand("fetch --all --tags");
  const lastRemoteCommit = runGitCommand(`rev-parse ${remote}/${baseBranch}`);

  // Squash the local commits above the last remote commit
  runGitCommand(`reset --soft ${lastRemoteCommit}`);
  runGitCommand(
    `commit --no-verify -m "chore(release): Squash local commits [skip ci]"`
  );

  // Get the new commit hash after squashing
  const newSquashedCommitHash = runGitCommand("rev-parse HEAD");
  console.log(`New squashed commit hash: ${newSquashedCommitHash}`);

  // Find the tags pointing to the old commits to be squashed
  let tagsToMove = runGitCommand(`tag --contains HEAD^`)
    .split("\n")
    .filter((tag) => tag);
  console.log(`Tags to move: ${tagsToMove}`);
  console.log(`Using ${os.cpus().length} worker threads.`);

  // Create a worker for each tag to move it to the new commit
  tagsToMove.forEach((tag) => {
    const worker = new Worker(__filename, {
      workerData: { tag, newSquashedCommitHash, remote },
    });
    worker.on("message", (message) => console.log(message));
    worker.on("error", (err) => console.error("Worker error:", err));
    worker.on("exit", (code) => {
      if (code !== 0) {
        console.error(`Worker stopped with exit code ${code}`);
      }
    });
  });
} else {
  // This block executes in worker threads
  const { tag, newSquashedCommitHash, remote } = workerData;

  console.log(`Worker processing tag: ${tag}`);
  runGitCommand(`tag -d ${tag}`);
  runGitCommand(`push ${remote} :refs/tags/${tag}`);
  runGitCommand(`tag ${tag} ${newSquashedCommitHash}`);
  runGitCommand(`push ${remote} refs/tags/${tag}`);

  parentPort.postMessage(`Tag ${tag} moved to commit ${newSquashedCommitHash}`);
}
