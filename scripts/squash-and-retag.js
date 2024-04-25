const { execSync, spawn } = require("child_process");
const { Worker, isMainThread, workerData } = require("worker_threads");
const os = require("os");

async function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`Running command: ${command} ${args.join(" ")}`);
    if (options.dryRun) {
      console.log(`DRY RUN: Command would have been executed`);
      resolve("Dry run mode enabled");
      return;
    }
    const proc = spawn(command, args, { shell: true });
    let output = "";
    proc.stdout.on("data", (data) => {
      output += data;
      console.log(data.toString());
    });
    proc.stderr.on("data", (data) => {
      console.error(data.toString());
    });
    proc.on("close", (code) => {
      if (code === 0) {
        console.log(`Command completed successfully: ${command}`);
        resolve(output);
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

async function squashCommits(baseBranch, dryRun = false) {
  try {
    console.log("Starting the squash commits process...");
    await runCommand("git", ["fetch"]);
    const remoteBase = `origin/${baseBranch}`;
    const baseCommit = await runCommand("git", [
      "merge-base",
      "HEAD",
      remoteBase,
    ]).then((output) => output.trim());
    console.log(`Base commit determined: ${baseCommit}`);

    console.log("Checking for changes to commit...");
    const status = await runCommand("git", ["status", "--porcelain"]);
    if (!status.trim()) {
      console.log("No changes to commit.");
      return;
    }

    console.log("Staging all changes...");
    await runCommand("git", ["add", "."]);

    const commitMessage = `"chore(release): release [skip ci]"`;
    console.log("Creating squashed commit...");
    await runCommand("git", ["commit", "-m", commitMessage], { dryRun });

    console.log("Squash commit process completed.");
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

if (isMainThread) {
  const baseBranch = process.argv[2] || "main"; // Default if no argument provided
  const dryRun = process.argv.includes("--dry-run");
  squashCommits(baseBranch, dryRun);
}
