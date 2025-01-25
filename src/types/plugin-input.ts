import { StaticDecode, Type as T } from "@sinclair/typebox";

/**
 * This should contain the properties of the bot config
 * that are required for the plugin to function.
 *
 * The kernel will extract those and pass them to the plugin,
 * which are built into the context object from setup().
 */
export const pluginSettingsSchema = T.Object(
  {
    configurableResponse: T.String({ default: "Hello, world!" }),
    customStringsUrl: T.Optional(T.String()),
    claude: T.Object({
      apiKey: T.String(),
      model: T.String({ default: "claude-3-sonnet-20240229" }),
      maxTokens: T.Number({ default: 4000 }),
      temperature: T.Number({ default: 0 }),
    }),
  },
  { default: {} }
);

export type PluginSettings = StaticDecode<typeof pluginSettingsSchema>;
