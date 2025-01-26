import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import { fetchManifests } from "./fetch-manifests";
import { parsePluginUrls } from "./parse-plugin-urls";
import { renderPrompt } from "./render-prompt";

export async function getModifiedContent(originalContent: string, instruction: string, parserCode: string, repoUrl: string, apiKey: string): Promise<string> {
  // Short circuit with mock response if environment variable is set
  if (process.env.USE_MOCK_CLAUDE_RESPONSE === "true") {
    return fs.readFileSync("tests/fixtures/ubiquity.yml", "utf8");
  }

  const pluginUrls = parsePluginUrls(originalContent);
  const manifests = await fetchManifests(pluginUrls);
  const prompt = await renderPrompt(originalContent, parserCode, JSON.stringify(manifests), repoUrl);

  const anthropic = new Anthropic({
    apiKey: apiKey,
  });

  const stream = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20240620",
    max_tokens: 4000,
    temperature: 0,
    system: prompt,
    messages: [
      {
        role: "user",
        content: instruction,
      },
    ],
    stream: true,
  });

  let fullContent = "";
  for await (const chunk of stream) {
    if (chunk.type === "content_block_delta" && "text" in chunk.delta) {
      const content = chunk.delta.text;
      if (content) {
        fullContent += content;
        process.stdout.write(content);
      }
    }
  }

  return fullContent.trim();
}
