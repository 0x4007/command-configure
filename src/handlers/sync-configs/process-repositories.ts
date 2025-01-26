import * as fs from "fs";
import path from "path";
import { getDefaultBranch } from "./get-default-branch";
import { processConfigurationRepository } from "./process-configuration-repository";
import { STORAGE_DIR } from "./sync-configs-agent";
import { targets } from "./targets";

export const LAST_RUN_INSTRUCTION = "last-run-instruction.txt";

export async function processRepositories(instruction: string) {
  const instructionFilePath = path.join(__dirname, STORAGE_DIR, LAST_RUN_INSTRUCTION);
  fs.writeFileSync(instructionFilePath, instruction, "utf8");

  const parserRepoIndex = targets.findIndex((repo) => repo.type === "parser");
  if (parserRepoIndex === -1) {
    throw new Error("Parser repository not found. Unable to proceed.");
  }
  const [parserRepo] = targets.splice(parserRepoIndex, 1);

  const parserFilePath = path.join(__dirname, STORAGE_DIR, parserRepo.localDir, parserRepo.filePath);
  if (!fs.existsSync(parserFilePath)) {
    throw new Error(`Parser file ${parserFilePath} does not exist. Unable to proceed.`);
  }
  const parserCode = fs.readFileSync(parserFilePath, "utf8");

  // Fetch default branches for all repositories upfront
  for (const target of targets) {
    if (target.type !== "parser") {
      if (!target.defaultBranch) {
        target.defaultBranch = await getDefaultBranch(target.owner, target.repo);
      }
    }
  }

  for (const target of targets) {
    if (target.type !== "parser") {
      await processConfigurationRepository(target, instruction, parserCode, process.env.ANTHROPIC_API_KEY || "");
    }
  }
}
