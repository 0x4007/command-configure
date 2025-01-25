import { appAuthenticatedOctokit } from "./create-pull-request";
import { getDefaultBranch } from "./get-default-branch";
import { processConfigurationRepository } from "./process-configuration-repository";

export interface Target {
  owner: string;
  repo: string;
  type: "parser" | "config";
  filePath: string;
}

export interface SyncResult {
  repository: string;
  changes: {
    file: string;
    before: string;
    after: string;
  }[];
}

export async function syncConfigsNonInteractive(targets: Target[]): Promise<SyncResult[]> {
  try {
    // First get the parser code
    const parserRepo = targets.find((t) => t.type === "parser");
    if (!parserRepo) {
      throw new Error("Parser repository configuration not found");
    }

    // Get default branch for parser repo
    const parserDefaultBranch = await getDefaultBranch(parserRepo.owner, parserRepo.repo);

    const { data: parserContent } = await appAuthenticatedOctokit.repos.getContent({
      owner: parserRepo.owner,
      repo: parserRepo.repo,
      path: parserRepo.filePath,
      ref: parserDefaultBranch,
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
          parserCode
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
