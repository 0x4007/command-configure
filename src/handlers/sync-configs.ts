import { Octokit } from "@octokit/rest";
import { postComment } from "@ubiquity-os/plugin-sdk";
import { Context } from "../types";
import { getDefaultBranch } from "./sync-configs/get-default-branch";
import { syncConfigsNonInteractive } from "./sync-configs/sync-configs-non-interactive";

export async function syncConfigs(context: Context) {
  const { logger, payload, octokit } = context;

  // Cast octokit to the correct type
  const octokitClient = octokit as unknown as Octokit;

  const sender = payload.comment.user?.login;
  const repo = payload.repository.name;
  const issueNumber = payload.issue.number;
  const owner = payload.repository.owner.login;
  const body = payload.comment.body;

  if (!body.match(/sync-configs/i)) {
    logger.error(`Invalid use of slash command, use "/sync-configs".`, { body });
    return;
  }

  logger.info("Starting sync-configs process");
  logger.debug(`Executing syncConfigs:`, { sender, repo, issueNumber, owner });

  try {
    // We'll use the octokit client instead of raw git operations
    // This is a simplified version that works within the plugin architecture
    const defaultBranch = await getDefaultBranch(octokitClient, owner, repo);

    await postComment(context, logger.ok("Starting configuration sync process..."));

    // Run in non-interactive mode since this is automated
    const changes = await syncConfigsNonInteractive(octokitClient, owner, repo, defaultBranch);

    await postComment(context, logger.ok(`Configuration sync completed. Changes made:\n${JSON.stringify(changes, null, 2)}`));
  } catch (error) {
    const err = error as Error;
    const errorMessage = err.message || "An unknown error occurred";
    logger.error("Error during sync-configs process", { error: err });
    await postComment(context, logger.error(`Error during sync process: ${errorMessage}`));
    return;
  }

  logger.ok(`Successfully completed sync-configs process`);
  logger.verbose(`Exiting syncConfigs`);
}
