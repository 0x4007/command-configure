import { Octokit } from "@octokit/rest";
import { processConfigurationRepository } from "./process-configuration-repository";

// These would typically come from environment variables or configuration
const DEFAULT_TARGETS = [
  {
    owner: "ubiquity",
    repo: "default-configs",
    type: "parser",
    filePath: "src/parser.ts"
  },
  {
    owner: "ubiquity",
    repo: "ubiquibot",
    type: "target",
    filePath: "config.json"
  }
];

export interface SyncResult {
  repository: string;
  changes: {
    file: string;
    before: string;
    after: string;
  }[];
}

export async function syncConfigsNonInteractive(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string
): Promise<SyncResult[]> {
  try {
    // First get the parser code
    const parserRepo = DEFAULT_TARGETS.find(t => t.type === "parser");
    if (!parserRepo) {
      throw new Error("Parser repository configuration not found");
    }

    const { data: parserContent } = await octokit.repos.getContent({
      owner: parserRepo.owner,
      repo: parserRepo.repo,
      path: parserRepo.filePath,
      ref: "main" // Assuming main branch for parser
    });

    if (!("content" in parserContent)) {
      throw new Error("Parser file not found or is a directory");
    }

    const parserCode = Buffer.from(parserContent.content, 'base64').toString();

    // Process each target repository
    const results: SyncResult[] = [];
    for (const target of DEFAULT_TARGETS) {
      if (target.type === "target") {
        const result = await processConfigurationRepository(
          octokit,
          target,
          "insert all missing defaults", // Default instruction
          parserCode,
          branch
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
