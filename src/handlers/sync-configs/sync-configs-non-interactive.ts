import { appAuthenticatedOctokit } from "./create-pull-request";
import { getDefaultBranch } from "./get-default-branch";
import { processConfigurationRepository } from "./process-configuration-repository";
import { Target } from "./targets";

export interface SyncResult {
  repository: string;
  changes: {
    file: string;
    before: string;
    after: string;
  }[];
}

export async function syncConfigsNonInteractive(targets: Target[], apiKey: string): Promise<SyncResult[]> {
  try {
    // First get the parser code
    const parserRepo = targets.find((t) => t.type === "parser");
    if (!parserRepo) {
      throw new Error("Parser repository configuration not found");
    }

    // Fetch default branches for all repositories upfront
    for (const target of targets) {
      if (!target.defaultBranch) {
        target.defaultBranch = await getDefaultBranch(target.owner, target.repo);
      }
    }

    // Also fetch for parser repo if not already set
    if (!parserRepo.defaultBranch) {
      parserRepo.defaultBranch = await getDefaultBranch(parserRepo.owner, parserRepo.repo);
    }
    const { data: parserContent } = await appAuthenticatedOctokit.repos.getContent({
      owner: parserRepo.owner,
      repo: parserRepo.repo,
      path: parserRepo.filePath,
      ref: parserRepo.defaultBranch,
    });

    if (!("content" in parserContent)) {
      throw new Error("Parser file not found or is a directory");
    }

    const parserCode = Buffer.from(parserContent.content, "base64").toString();

    // Process each target repository
    const results: SyncResult[] = [];
    for (const target of targets) {
      if (target.type === "config") {
        const result = await processConfigurationRepository(
          target,
          "insert all missing defaults", // Default instruction
          parserCode,
          apiKey
        );
        results.push(result);
      }
    }

    return results;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Sync configs failed: ${error.message}`);
    }
    throw new Error("Sync configs failed: Unknown error");
  }
}
