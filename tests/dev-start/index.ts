import { syncConfigsNonInteractive } from "../../src/handlers/sync-configs/sync-configs-non-interactive";
import { Target, targets } from "../../src/handlers/sync-configs/targets";
import { requiredEnvVars } from "./constants";
import { getRequiredEnvVar, validateEnvVars } from "./env-utils";
import { configureGit } from "./git-config";

// Check for required environment variables
validateEnvVars(requiredEnvVars);

let globalInstallationId: number;

export async function devStart(repoUrl?: string) {
  try {
    // Configure git first and get the token
    const token = await configureGit();
    if (!process.env.INSTALLATION_ID) {
      throw new Error("INSTALLATION_ID not set after configuring git");
    }
    globalInstallationId = parseInt(process.env.INSTALLATION_ID);

    // Set required environment variables
    process.env.ANTHROPIC_API_KEY = getRequiredEnvVar("ANTHROPIC_API_KEY");
    process.env.EDITOR_INSTRUCTION = getRequiredEnvVar("EDITOR_INSTRUCTION");
    process.env.INTERACTIVE = getRequiredEnvVar("INTERACTIVE");
    process.env.ACTOR = getRequiredEnvVar("ACTOR");
    process.env.EMAIL = getRequiredEnvVar("EMAIL");
    process.env.AUTH_TOKEN = token;
    process.env.INSTALLATION_ID = globalInstallationId.toString();
    process.env.USE_MOCK_CLAUDE_RESPONSE = "true"; // Short circuit Claude response in tests

    // If a custom repo URL is provided, update the targets
    if (repoUrl) {
      const [owner, repo] = repoUrl.split("/").slice(-2);
      targets.forEach((target: Target) => {
        if (target.type === "config") {
          target.owner = owner;
          target.repo = repo;
        }
      });
    }

    // Run sync configs directly
    console.log("Starting configuration sync...");
    const results = await syncConfigsNonInteractive(targets);
    console.log("Sync results:", JSON.stringify(results, null, 2));

    console.log("Script completed successfully");
  } catch (error) {
    console.error("Error running script:", error);
    process.exit(1);
  }
}
