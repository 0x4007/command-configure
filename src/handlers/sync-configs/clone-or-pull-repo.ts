import * as fs from "fs";
import * as path from "path";
import simpleGit, { SimpleGit } from "simple-git";
import { getDefaultBranch } from "./get-default-branch";
import { STORAGE_DIR } from "./sync-configs-agent";
import { Target } from "./targets";

interface GitConfig {
  name: string;
  email: string;
}

const BOT_CONFIG: GitConfig = {
  name: "ubiquity-os[bot]",
  email: "ubiquity-os[bot]@users.noreply.github.com",
};

function cleanupGitLocks(repoPath: string): void {
  const lockFiles = [path.join(repoPath, ".git", "index.lock"), path.join(repoPath, ".git", "HEAD.lock")];

  for (const lockFile of lockFiles) {
    if (fs.existsSync(lockFile)) {
      try {
        fs.unlinkSync(lockFile);
        console.log(`Removed stale lock file: ${lockFile}`);
      } catch (error) {
        console.warn(`Failed to remove lock file ${lockFile}:`, error);
      }
    }
  }
}

function getAuthenticatedUrl(url: string, token: string | undefined): string {
  if (!token) return url;
  return url.replace("https://github.com", `https://${BOT_CONFIG.name}:${token}@github.com`);
}

async function configureBotIdentity(git: SimpleGit): Promise<void> {
  await git.addConfig("user.name", BOT_CONFIG.name, false, "local");
  await git.addConfig("user.email", BOT_CONFIG.email, false, "local");
}

async function updateExistingRepo(git: SimpleGit, target: Target): Promise<void> {
  try {
    await configureBotIdentity(git);

    if (!target.defaultBranch) {
      target.defaultBranch = await getDefaultBranch(target.owner, target.repo);
    }

    console.log(`Fetching updates for ${target.url}...`);
    await git.fetch("origin");
    await git.reset(["--hard", `origin/${target.defaultBranch}`]);
    console.log(`Successfully updated ${target.url}`);
  } catch (error) {
    console.error(`Error updating ${target.url}:`, error);
    throw error;
  }
}

async function cloneNewRepo(authenticatedUrl: string, repoPath: string, target: Target): Promise<void> {
  try {
    console.log(`Cloning ${target.url}...`);
    fs.mkdirSync(repoPath, { recursive: true });
    cleanupGitLocks(repoPath);

    const git: SimpleGit = simpleGit();
    await git.clone(authenticatedUrl, repoPath);

    const localGit = git.cwd(repoPath);
    await configureBotIdentity(localGit);

    console.log(`Successfully cloned ${target.url}`);
  } catch (error) {
    console.error(`Error cloning ${target.url}:`, error);
    throw error;
  }
}

function validateToken(): void {
  const token = process.env.AUTH_TOKEN;
  if (!token && process.env.GITHUB_ACTIONS) {
    throw new Error("AUTH_TOKEN is not set");
  }
}

export async function cloneOrPullRepo(target: Target): Promise<void> {
  validateToken();

  const repoPath = path.join(__dirname, STORAGE_DIR, target.localDir);
  const authenticatedUrl = getAuthenticatedUrl(target.url, process.env.AUTH_TOKEN);

  if (fs.existsSync(repoPath)) {
    cleanupGitLocks(repoPath);
    const git: SimpleGit = simpleGit(repoPath);

    if (await git.checkIsRepo()) {
      await updateExistingRepo(git, target);
    } else {
      throw new Error(`Directory ${repoPath} exists but is not a git repository.`);
    }
  } else {
    await cloneNewRepo(authenticatedUrl, repoPath, target);
  }
}
