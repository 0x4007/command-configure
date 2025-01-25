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
  ignore: ["src/types/config.ts", "**/__mocks__/**", "**/__fixtures__/**", "dist/*"],
  ignoreExportsUsedInFile: true,
  ignoreDependencies: ["ts-node"], // Only ignore ts-node as it's used by the runtime
  eslint: true,
};

export default config;
