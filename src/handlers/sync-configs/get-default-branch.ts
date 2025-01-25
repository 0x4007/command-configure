import { appAuthenticatedOctokit } from "./create-pull-request";

export async function getDefaultBranch(owner: string, repo: string): Promise<string> {
  try {
    const { data: repository } = await appAuthenticatedOctokit.repos.get({
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
