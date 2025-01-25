import { Octokit } from "@octokit/rest";
import { getModifiedContent } from "./get-modified-content";

interface Target {
  owner: string;
  repo: string;
  type: string;
  filePath: string;
}

export async function processConfigurationRepository(octokit: Octokit, target: Target, instruction: string, parserCode: string, branch: string) {
  try {
    // Get current file content
    const { data: fileData } = await octokit.repos.getContent({
      owner: target.owner,
      repo: target.repo,
      path: target.filePath,
      ref: branch,
    });

    if (!("content" in fileData)) {
      throw new Error("Target file not found or is a directory");
    }

    const currentContent = Buffer.from(fileData.content, "base64").toString();

    // Generate modified content
    const modifiedContent = await getModifiedContent(currentContent, instruction, parserCode, `${target.owner}/${target.repo}`);

    if (currentContent === modifiedContent) {
      return {
        repository: `${target.owner}/${target.repo}`,
        changes: [],
      };
    }

    // Create a new branch for the changes
    const timestamp = new Date().getTime();
    const newBranch = `sync-configs-${timestamp}`;

    // Get the current commit SHA
    const { data: ref } = await octokit.git.getRef({
      owner: target.owner,
      repo: target.repo,
      ref: `heads/${branch}`,
    });

    // Create new branch
    await octokit.git.createRef({
      owner: target.owner,
      repo: target.repo,
      ref: `refs/heads/${newBranch}`,
      sha: ref.object.sha,
    });

    // Create commit with changes
    const { data: blob } = await octokit.git.createBlob({
      owner: target.owner,
      repo: target.repo,
      content: modifiedContent,
      encoding: "utf-8",
    });

    const { data: tree } = await octokit.git.createTree({
      owner: target.owner,
      repo: target.repo,
      base_tree: ref.object.sha,
      tree: [
        {
          path: target.filePath,
          mode: "100644",
          type: "blob",
          sha: blob.sha,
        },
      ],
    });

    const { data: commit } = await octokit.git.createCommit({
      owner: target.owner,
      repo: target.repo,
      message: `Sync configurations\n\nAutomatically synced configurations using sync-configs plugin`,
      tree: tree.sha,
      parents: [ref.object.sha],
    });

    // Update branch reference
    await octokit.git.updateRef({
      owner: target.owner,
      repo: target.repo,
      ref: `heads/${newBranch}`,
      sha: commit.sha,
    });

    // Create pull request
    await octokit.pulls.create({
      owner: target.owner,
      repo: target.repo,
      title: "Sync configurations",
      head: newBranch,
      base: branch,
      body: "This pull request was automatically created by the sync-configs plugin to update configurations.",
    });

    return {
      repository: `${target.owner}/${target.repo}`,
      changes: [
        {
          file: target.filePath,
          before: currentContent,
          after: modifiedContent,
        },
      ],
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to process repository ${target.owner}/${target.repo}: ${error.message}`);
    }
    throw new Error(`Failed to process repository ${target.owner}/${target.repo}: Unknown error`);
  }
}
