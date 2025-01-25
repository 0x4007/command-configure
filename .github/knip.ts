import type { KnipConfig } from "knip";

const config: KnipConfig = {
  entry: [
    // Main entry points
    "src/action.ts",
    "src/worker.ts",
    "src/index.ts",
    // Test files
    "tests/**/*.ts",
    // Dev scripts
    "tests/dev-start.ts",
  ],
  project: ["src/**/*.ts", "tests/**/*.ts"],
  ignore: [
    "src/types/config.ts",
    "**/__mocks__/**",
    "**/__fixtures__/**",
    "dist/*"
  ],
  ignoreExportsUsedInFile: true,
  ignoreDependencies: [
    // Runtime dependencies
    "ts-node",
    "nodemon", // Used for development watching
    "@octokit/auth-app", // Used for GitHub authentication
    "inquirer", // Used for interactive prompts
    // Dev dependencies used in configuration
    "@eslint/js",
    "@typescript-eslint/eslint-plugin",
    "@typescript-eslint/parser",
    "esbuild",
    "eslint-config-prettier",
    "eslint-plugin-check-file",
    "eslint-plugin-filename-rules",
    "eslint-plugin-prettier",
    "eslint-plugin-sonarjs",
    "tsx",
    "typescript-eslint"
  ],
  eslint: true,
};

export default config;
