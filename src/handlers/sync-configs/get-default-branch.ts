import { Octokit } from "@octokit/rest";

export async function getDefaultBranch(octokit: Octokit, owner: string, repo: string): Promise<string> {
  try {
    const { data: repository } = await octokit.repos.get({
      owner,
      repo,
    });

    return repository.default_branch;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get default branch: ${error.message}`);
    }
    throw new Error("Failed to get default branch: Unknown error");
  }
}
