import { syncConfigs } from "./handlers/sync-configs";
import { Context } from "./types";
import { isIssueCommentEvent } from "./types/typeguards";

/**
 * The main plugin function. Split for easier testing.
 */
export async function runPlugin(context: Context) {
  const { logger, eventName } = context;

  if (isIssueCommentEvent(context)) {
    const { body } = context.payload.comment;

    const configCommandPattern = /^\/config/i;
    if (configCommandPattern.exec(body)) {
      return await syncConfigs(context);
    }
  }

  logger.error(`Unsupported event: ${eventName}`);
}
