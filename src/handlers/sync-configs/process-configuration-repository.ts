import { appAuthenticatedOctokit } from "./create-pull-request";
import { getModifiedContent } from "./get-modified-content";
import { Target } from "./targets";

export async function processConfigurationRepository(target: Target, instruction: string, parserCode: string, apiKey: string) {
  try {
    if (!target.defaultBranch) {
      throw new Error(`Default branch not set for repository ${target.owner}/${target.repo}`);
    }

    // Get current file content
    const { data: fileData } = await appAuthenticatedOctokit.repos.getContent({
      owner: target.owner,
      repo: target.repo,
      path: target.filePath,
      ref: target.defaultBranch,
    });

    if (!("content" in fileData)) {
      throw new Error("Target file not found or is a directory");
    }

    const currentContent = Buffer.from(fileData.content, "base64").toString();

    // Generate modified content
    const modifiedContent = await getModifiedContent(currentContent, instruction, parserCode, `${target.owner}/${target.repo}`, apiKey);

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
    const { data: ref } = await appAuthenticatedOctokit.git.getRef({
      owner: target.owner,
      repo: target.repo,
      ref: `heads/${target.defaultBranch}`,
    });

    // Create new branch
    await appAuthenticatedOctokit.git.createRef({
      owner: target.owner,
      repo: target.repo,
      ref: `refs/heads/${newBranch}`,
      sha: ref.object.sha,
    });

    // Create commit with changes
    const { data: blob } = await appAuthenticatedOctokit.git.createBlob({
      owner: target.owner,
      repo: target.repo,
      content: modifiedContent,
      encoding: "utf-8",
    });

    const { data: tree } = await appAuthenticatedOctokit.git.createTree({
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

    const { data: commit } = await appAuthenticatedOctokit.git.createCommit({
      owner: target.owner,
      repo: target.repo,
      message: `Sync configurations\n\nAutomatically synced configurations using sync-configs plugin`,
      tree: tree.sha,
      parents: [ref.object.sha],
    });

    // Update branch reference
    await appAuthenticatedOctokit.git.updateRef({
      owner: target.owner,
      repo: target.repo,
      ref: `heads/${newBranch}`,
      sha: commit.sha,
    });

    // Create pull request
    await appAuthenticatedOctokit.pulls.create({
      owner: target.owner,
      repo: target.repo,
      title: "Sync configurations",
      head: newBranch,
      base: target.defaultBranch,
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
