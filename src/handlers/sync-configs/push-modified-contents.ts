import * as fs from "fs";
import path from "path";
import { applyChangesNonInteractive } from "./apply-changes";
import { LAST_RUN_INSTRUCTION } from "./process-repositories";
import { STORAGE_DIR } from "./sync-configs-agent";
import { targets } from "./targets";

export async function pushModifiedContents() {
  for (const target of targets) {
    if (target.type === "parser") {
      continue; // no changes to parser
    }
    const filePath = path.join(__dirname, STORAGE_DIR, target.localDir, target.filePath);
    const modifiedFilePath = `${filePath}.modified`;

    if (fs.existsSync(modifiedFilePath)) {
      const modifiedContent = fs.readFileSync(modifiedFilePath, "utf8");
      await applyChangesNonInteractive({
        target,
        filePath,
        modifiedContent,
        instruction: fs.readFileSync(path.join(__dirname, STORAGE_DIR, [`Rerunning using \`--push\` flag.`, LAST_RUN_INSTRUCTION].join("\n\n")), "utf8"),
      });
    } else {
      console.log(`No modified file found for ${target.url}. Skipping.`);
    }
  }
}
