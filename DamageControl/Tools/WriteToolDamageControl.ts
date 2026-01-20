/**
 * DamageControl - Write Tool Security Hook
 * =========================================
 *
 * PreToolUse hook that validates Write tool file paths.
 * Blocks writes to protected paths (zeroAccess and readOnly).
 *
 * Exit codes:
 * 0 = Allow write
 * 2 = Block write (stderr fed back to Claude)
 */

import {
  loadDamageControlConfig,
  checkPathRestrictions,
  checkWriteContent as checkWriteContentLib,
  type DamageControlConfig,
} from "../../../hooks/lib/damage-control-config";
import { homedir } from "os";

// Config type alias for backward compatibility with tests
type Config = DamageControlConfig;

// Types
interface HookInput {
  tool_name: string;
  tool_input: {
    file_path?: string;
    content?: string;
  };
}

interface CheckResult {
  blocked: boolean;
  reason: string;
}

/**
 * Check if a string contains glob pattern characters
 */
function isGlobPattern(pattern: string): boolean {
  return /[*?\[\]]/.test(pattern);
}

/**
 * Convert a glob pattern to a RegExp
 */
function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|\\]/g, "\\$&")
    .replace(/\*\*/g, ".*")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, "[^/]")
    .replace(/\[!/g, "[^")
    .replace(/\[([^\]]+)\]/g, "[$1]");

  return new RegExp(`^${escaped}$`);
}

/**
 * Expand path variables like ~ and $PAI_DIR
 */
function expandPath(path: string): string {
  const paiDir = process.env.PAI_DIR || `${homedir()}/.claude`;
  return path
    .replace(/^\$PAI_DIR/, paiDir)
    .replace(/^\${PAI_DIR}/, paiDir)
    .replace(/^~/, homedir());
}

/**
 * Check if a file path matches a pattern
 */
function matchPath(filePath: string, pattern: string): boolean {
  const expandedPattern = expandPath(pattern);
  const expandedPath = expandPath(filePath);

  if (expandedPattern.endsWith("/")) {
    const prefix = expandedPattern.slice(0, -1);
    return expandedPath.startsWith(prefix);
  }

  if (isGlobPattern(pattern)) {
    const regex = globToRegex(expandedPattern);
    if (regex.test(expandedPath)) return true;
    const basename = expandedPath.split("/").pop() || "";
    if (regex.test(basename)) return true;
    return false;
  }

  return (
    expandedPath === expandedPattern ||
    expandedPath.endsWith(`/${pattern}`) ||
    expandedPath.startsWith(expandedPattern)
  );
}

/**
 * Check if path is blocked by config
 */
function checkPath(filePath: string, config: Config): CheckResult {
  // Check zero-access paths
  for (const pattern of config.zeroAccessPaths || []) {
    if (matchPath(filePath, pattern)) {
      return { blocked: true, reason: `zero-access path: ${pattern}` };
    }
  }
  // Check read-only paths
  for (const pattern of config.readOnlyPaths || []) {
    if (matchPath(filePath, pattern)) {
      return { blocked: true, reason: `read-only path: ${pattern}` };
    }
  }
  return { blocked: false, reason: "" };
}

/**
 * Check if content is blocked by config
 */
function checkContent(filePath: string, content: string, config: Config): CheckResult {
  for (const pattern of config.writeContentPatterns || []) {
    const fileRegex = new RegExp(pattern.filePattern);
    if (fileRegex.test(filePath)) {
      const contentRegex = new RegExp(pattern.contentPattern);
      if (contentRegex.test(content)) {
        return { blocked: true, reason: pattern.reason };
      }
    }
  }
  return { blocked: false, reason: "" };
}

async function main(): Promise<void> {
  const config = loadDamageControlConfig();

  // Read JSON from stdin
  let inputText = "";
  for await (const chunk of Bun.stdin.stream()) {
    inputText += new TextDecoder().decode(chunk);
  }

  let input: HookInput;
  try {
    input = JSON.parse(inputText);
  } catch (e) {
    console.error(`Error: Invalid JSON input: ${e}`);
    process.exit(1);
  }

  // Only check Write tool
  if (input.tool_name !== "Write") {
    process.exit(0);
  }

  const filePath = input.tool_input?.file_path || "";
  if (!filePath) {
    process.exit(0);
  }

  // Check path restrictions (write operation)
  const pathResult = checkPathRestrictions(filePath, config, ["write"]);
  if (pathResult.blocked) {
    console.error(`SECURITY: Blocked write to ${pathResult.reason}: ${filePath}`);
    process.exit(2);
  }

  // Check content restrictions
  const content = input.tool_input?.content || "";
  if (content) {
    const contentResult = checkWriteContent(filePath, content, config);
    if (contentResult.blocked) {
      console.error(`SECURITY: Blocked write due to ${contentResult.reason}: ${filePath}`);
      process.exit(2);
    }
  }

  process.exit(0);
}

// Only run main when executed directly, not when imported for testing
if (import.meta.main) {
  main().catch((e) => {
    console.error(`Hook error: ${e}`);
    process.exit(0); // Fail open
  });
}

// Export for testing
export {
  isGlobPattern,
  globToRegex,
  expandPath,
  matchPath,
  checkPath,
  checkContent,
  type Config,
};
