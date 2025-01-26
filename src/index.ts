import { syncConfigs } from "./handlers/sync-configs";
import { Context } from "./types";
import { isIssueCommentEvent } from "./types/typeguards";

/**
 * The main plugin function. Split for easier testing.
 */
export async function runPlugin(context: Context) {
  const { logger } = context;

  console.dir('logger.debug("plugin is starting.");');
  logger.debug("plugin is starting.");
  if (!isIssueCommentEvent(context)) return;
  console.dir('logger.debug("this event is an issue comment event.");');
  logger.debug("this event is an issue comment event.");
  const { body } = context.payload.comment;
  const configCommandPattern = /^\/config/i;
  if (configCommandPattern.exec(body)) {
    console.dir('logger.debug("`/config` command detected.");');
    logger.debug("`/config` command detected.");
    await syncConfigs(context);
    console.dir('return logger.ok("ran `syncConfigs` successfully!");');
    return logger.ok("ran `syncConfigs` successfully!");
  }
  console.dir('return logger.error("Unexpected error!");');
  return logger.error("Unexpected error!");
}
