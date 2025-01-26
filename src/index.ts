import { syncConfigs } from "./handlers/sync-configs";
import { Context } from "./types";
import { isIssueCommentEvent } from "./types/typeguards";

/**
 * The main plugin function. Split for easier testing.
 */
export async function runPlugin(context: Context) {
  const { logger } = context;

  logger.debug("plugin is starting.");
  if (!isIssueCommentEvent(context)) return;
  logger.debug("this event is an issue comment event.");
  const { body } = context.payload.comment;
  const configCommandPattern = /^\/config/i;
  if (configCommandPattern.exec(body)) {
    logger.debug("`/config` command detected.");
    await syncConfigs(context);
    return logger.ok("ran `syncConfigs` successfully!");
  }
  return logger.error("Unexpected error!");
}
