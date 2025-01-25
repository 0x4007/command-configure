import { StaticDecode, Type as T } from "@sinclair/typebox";
import { LOG_LEVEL } from "@ubiquity-os/ubiquity-os-logger";
import "dotenv/config";

/**
 * Define sensitive environment variables here.
 *
 * These are fed into the worker/workflow as `env` and are
 * taken from either `dev.vars` or repository secrets.
 * They are used with `process.env` but are type-safe.
 */
export const envSchema = T.Object({
  LOG_LEVEL: T.Optional(T.Enum(LOG_LEVEL)),
  KERNEL_PUBLIC_KEY: T.Optional(T.String()),

  // Sync configs environment variables
  ANTHROPIC_API_KEY: T.String(),
  EDITOR_INSTRUCTION: T.String({ default: "insert all missing defaults" }),
  INTERACTIVE: T.String({ default: "false" }),
  ACTOR: T.String({ default: "ubiquity-os[bot]" }),
  EMAIL: T.String({ default: "ubiquity-os[bot]@users.noreply.github.com" })
});

export type Env = StaticDecode<typeof envSchema>;
