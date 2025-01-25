import { helloWorld } from "./handlers/hello-world";
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

    if (body.match(/^\/config/i)) {
      return await syncConfigs(context);
    }

    return await helloWorld(context);
  }

  logger.error(`Unsupported event: ${eventName}`);
}
