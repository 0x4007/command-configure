import chalk from "chalk";
import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

function validateAndSanitizePath(filePath: string): string {
  if (!filePath || typeof filePath !== "string") {
    throw new Error("Invalid file path");
  }

  try {
    // Resolve to absolute path and normalize
    const resolvedPath = path.resolve(filePath);

    // Verify the file exists and is readable
    const stats = fs.statSync(resolvedPath);
    if (!stats.isFile()) {
      throw new Error("Path is not a file");
    }

    // Check file permissions
    fs.accessSync(resolvedPath, fs.constants.R_OK);

    return resolvedPath;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`File validation failed: ${error.message}`);
    }
    throw error;
  }
}

function colorDiff(diffOutput: string): string {
  return diffOutput
    .split("\n")
    .map((line) => {
      if (line.startsWith("+")) {
        return chalk.green(line);
      } else if (line.startsWith("-")) {
        return chalk.red(line);
      } else if (line.startsWith("@")) {
        return chalk.cyan(line);
      }
      return line;
    })
    .join("\n");
}

export async function getDiff(originalFile: string, modifiedFile: string): Promise<string> {
  try {
    const sanitizedOriginal = validateAndSanitizePath(originalFile);
    const sanitizedModified = validateAndSanitizePath(modifiedFile);

    // Use execFile instead of exec for better security
    // Pass arguments separately to prevent command injection
    const { stdout } = await execFileAsync("diff", ["-u", sanitizedOriginal, sanitizedModified]);

    return colorDiff(stdout);
  } catch (error) {
    if (error instanceof Error) {
      // diff exits with code 1 if files are different, which is expected
      if ("code" in error && error.code === 1 && "stdout" in error) {
        return colorDiff(error.stdout as string);
      }
      throw new Error(`Failed to generate diff: ${error.message}`);
    }
    throw error;
  }
}
