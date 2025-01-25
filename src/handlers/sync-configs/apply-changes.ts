import * as fs from "fs";
import path from "path";
import simpleGit, { SimpleGit } from "simple-git";
import { createPullRequest } from "./create-pull-request";
import { getDefaultBranch } from "./get-default-branch";
import { STORAGE_DIR } from "./sync-configs-agent";
import { Target } from "./targets";

function initializeGit(localDir: string): SimpleGit {
  const git = simpleGit({
    baseDir: path.join(__dirname, STORAGE_DIR, localDir),
    binary: "git",
    maxConcurrentProcesses: 6,
    trimmed: false,
    config: [`user.name=${process.env.ACTOR}`, `user.email=${process.env.EMAIL}`],
  });

  git.outputHandler((command, stdout, stderr) => {
    stdout.pipe(process.stdout);
    stderr.pipe(process.stderr);
  });

  return git;
}

async function setupAuthentication(git: SimpleGit, targetUrl: string) {
  await git.removeRemote("origin").catch(() => null);
  await git.addRemote("origin", targetUrl);
  console.log("Configured remote URL");
}

function createCommitMessage(instruction: string, isGitHubActions: boolean): string {
  if (isGitHubActions) {
    return ["chore: update", instruction, `Via @${process.env.ACTOR}`].join("\n\n");
  }
  return ["chore: update configuration using UbiquityOS Configurations Agent", instruction].join("\n\n");
}

export async function applyChangesInteractive({
  target,
  filePath,
  modifiedContent,
  instruction,
}: {
  target: Target;
  filePath: string;
  modifiedContent: string;
  instruction: string;
}) {
  const git = initializeGit(target.localDir);
  const isGitHubActions = !!process.env.GITHUB_ACTIONS;

  console.log(`Operating in ${isGitHubActions ? "GitHub Actions" : "local"} environment`);

  await setupAuthentication(git, target.url);
  if (!target.defaultBranch) {
    target.defaultBranch = await getDefaultBranch(target.owner, target.repo);
  }

  await git.checkout(target.defaultBranch);
  await git.pull("origin", target.defaultBranch);

  fs.writeFileSync(filePath, modifiedContent, "utf8");
  await git.add([target.filePath]);
  await git.commit(createCommitMessage(instruction, isGitHubActions), { "--no-verify": null });

  try {
    await git.push("origin", target.defaultBranch);
    console.log(`Changes pushed to ${target.url} in branch ${target.defaultBranch}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error applying changes to ${target.url}:`, error.message);
      if (error.stack) {
        console.error("Stack trace:", error.stack);
      }
    } else {
      console.error(`Error applying changes to ${target.url}:`, error);
    }
    throw error;
  }
}

export async function applyChangesNonInteractive({
  target,
  filePath,
  modifiedContent,
  instruction,
}: {
  target: Target;
  filePath: string;
  modifiedContent: string;
  instruction: string;
}) {
  const git = initializeGit(target.localDir);
  const isGitHubActions = !!process.env.GITHUB_ACTIONS;
  const branchName = `sync-configs-${Date.now()}`;

  console.log(`Operating in ${isGitHubActions ? "GitHub Actions" : "local"} environment`);

  await setupAuthentication(git, target.url);
  if (!target.defaultBranch) {
    target.defaultBranch = await getDefaultBranch(target.owner, target.repo);
  }

  await git.checkout(target.defaultBranch);
  await git.pull("origin", target.defaultBranch);

  fs.writeFileSync(filePath, modifiedContent, "utf8");
  await git.add([target.filePath]);
  await git.commit(createCommitMessage(instruction, isGitHubActions), { "--no-verify": null });

  try {
    await git.checkoutLocalBranch(branchName);
    await git.push("origin", branchName, ["-u"]);
    console.log(`Successfully pushed branch ${branchName} to ${target.url}`);

    await createAndLogPullRequest(target, branchName, target.defaultBranch, instruction);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error applying changes to ${target.url}:`, error.message);
      if (error.stack) {
        console.error("Stack trace:", error.stack);
      }
      if (isGitHubActions) {
        console.error(`Note: Ensure @${process.env.ACTOR} has write access to ${target.url}`);
      }
    } else {
      console.error(`Error applying changes to ${target.url}:`, error);
    }
    throw error;
  }
}

async function createAndLogPullRequest(target: Target, branchName: string, defaultBranch: string, instruction: string) {
  console.log({ target, branchName, defaultBranch });
  console.log(`Creating PR for target URL: ${target.url}`);
  try {
    const prUrl = await createPullRequest({ target, branchName, defaultBranch, instruction });
    console.log(`Pull request created: ${prUrl}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Failed to create pull request:", errorMessage);
    console.log(`Branch '${branchName}' has been pushed. You may need to create the pull request manually.`);
  }
}
