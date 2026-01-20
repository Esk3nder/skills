/**
 * DamageControl - Bash Tool Security Hook
 * ========================================
 *
 * PreToolUse hook that validates bash commands against security patterns.
 * Blocks dangerous commands and protects sensitive file paths.
 *
 * Exit codes:
 * 0 = Allow command
 * 0 + JSON output = Trigger permission dialog (ask patterns)
 * 2 = Block command (stderr fed back to Claude)
 */

import {
  loadDamageControlConfig,
  checkPathRestrictions,
  type DamageControlConfig,
} from "../../../hooks/lib/damage-control-config";
import { homedir } from "os";

// Types
interface HookInput {
  tool_name: string;
  tool_input: {
    command?: string;
    [key: string]: unknown;
  };
}

// Config type alias for backward compatibility with tests
type Config = DamageControlConfig;

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
    .replace(/[.+^${}()|\\]/g, "\\$&") // Escape regex special chars except * ? [ ]
    .replace(/\*\*/g, ".*") // ** matches anything
    .replace(/\*/g, "[^/]*") // * matches anything except /
    .replace(/\?/g, "[^/]") // ? matches single char except /
    .replace(/\[!/g, "[^") // [!...] becomes [^...]
    .replace(/\[([^\]]+)\]/g, "[$1]"); // Keep [...] as-is

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

  // Directory prefix match (pattern ends with /)
  if (expandedPattern.endsWith("/")) {
    const prefix = expandedPattern.slice(0, -1);
    return expandedPath.startsWith(prefix);
  }

  // Glob pattern - try matching against both full path and basename
  if (isGlobPattern(pattern)) {
    const regex = globToRegex(expandedPattern);
    // Try matching full path
    if (regex.test(expandedPath)) {
      return true;
    }
    // Try matching just the basename
    const basename = expandedPath.split("/").pop() || "";
    if (regex.test(basename)) {
      return true;
    }
    return false;
  }

  // Exact match or path contains pattern as component
  return (
    expandedPath === expandedPattern ||
    expandedPath.endsWith(`/${pattern}`) ||
    expandedPath.startsWith(expandedPattern)
  );
}

interface CheckResult {
  blocked: boolean;
  ask: boolean;
  reason: string;
}

// Operation detection patterns
const WRITE_PATTERNS = [/>\s*\S+/, /tee\s+\S+/];
const EDIT_PATTERNS = [/sed\s+-i/, /perl\s+-i/, /awk\s+-i/];
const MOVE_COPY_PATTERNS = [/\bmv\s+/, /\bcp\s+/];
const DELETE_PATTERNS = [/\brm\s+/, /\bunlink\s+/, /\brmdir\s+/];
const PERMISSION_PATTERNS = [/\bchmod\s+/, /\bchown\s+/];

function extractPathsFromCommand(command: string): string[] {
  const paths: string[] = [];

  // First, strip out content that is text/messages, not actual file paths being operated on.
  // This prevents false positives when commit messages mention paths like "/root/.claude"
  //
  // SECURITY NOTE: This only affects which paths are checked against readOnlyPaths etc.
  // Dangerous command patterns (rm -rf, etc.) are checked BEFORE this on the full command.
  let commandWithoutMessages = command
    // Git commit messages: -m "..." or -m '...' or --message="..."
    .replace(/(?:-m|--message)\s*=?\s*"[^"]*"/g, "")
    .replace(/(?:-m|--message)\s*=?\s*'[^']*'/g, "")
    // Heredoc-style messages: -m "$(cat <<'EOF' ... EOF)"
    // Match the whole $(...) construct for -m flags
    .replace(/(?:-m|--message)\s*=?\s*"\$\(cat\s+<<[^)]+\)"/g, "")
    // Also handle unquoted heredoc style
    .replace(/(?:-m|--message)\s*=?\s*\$\(cat\s+<<[\s\S]*?EOF[\s\S]*?\)/g, "");

  // Common path patterns in commands
  const pathPatterns = [
    // Absolute paths
    /(?:^|\s)(\/[\w./-]+)/g,
    // Home directory paths
    /(?:^|\s)(~[\w./-]*)/g,
    // Relative paths with common prefixes
    /(?:^|\s)(\.\.?\/[\w./-]+)/g,
    // Quoted paths (only after stripping messages)
    /"([^"]+)"/g,
    /'([^']+)'/g,
  ];

  for (const pattern of pathPatterns) {
    let match;
    while ((match = pattern.exec(commandWithoutMessages)) !== null) {
      const path = match[1];
      if (path && !path.startsWith("-") && path.length > 1) {
        paths.push(path);
      }
    }
  }

  return [...new Set(paths)]; // Deduplicate
}

function detectOperation(command: string): string[] {
  const operations: string[] = [];

  if (DELETE_PATTERNS.some((p) => p.test(command))) {
    operations.push("delete");
  }
  if (WRITE_PATTERNS.some((p) => p.test(command))) {
    operations.push("write");
  }
  if (EDIT_PATTERNS.some((p) => p.test(command))) {
    operations.push("edit");
  }
  if (MOVE_COPY_PATTERNS.some((p) => p.test(command))) {
    operations.push("write");
  }
  if (PERMISSION_PATTERNS.some((p) => p.test(command))) {
    operations.push("permission");
  }

  return operations.length > 0 ? operations : ["read"];
}

// Main validation logic
function checkCommand(command: string, config: DamageControlConfig): CheckResult {
  const reasons: string[] = [];
  let shouldAsk = false;

  // 1. Check bash command patterns
  for (const pattern of config.bashToolPatterns) {
    try {
      const regex = new RegExp(pattern.pattern, "i");
      if (regex.test(command)) {
        if (pattern.ask) {
          shouldAsk = true;
          reasons.push(pattern.reason);
        } else {
          return {
            blocked: true,
            ask: false,
            reason: pattern.reason,
          };
        }
      }
    } catch (e) {
      console.error(`Invalid regex pattern: ${pattern.pattern}`);
    }
  }

  // 2. Extract paths and check against path restrictions
  const paths = extractPathsFromCommand(command);
  const operations = detectOperation(command);

  for (const path of paths) {
    const result = checkPathRestrictions(path, config, operations);
    if (result.blocked) {
      return {
        blocked: true,
        ask: false,
        reason: result.reason,
      };
    }
  }

  // 3. Return ask result if any ask patterns matched
  if (shouldAsk && reasons.length > 0) {
    return {
      blocked: false,
      ask: true,
      reason: reasons.join(", "),
    };
  }

  return {
    blocked: false,
    ask: false,
    reason: "",
  };
}

// Main entry point
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

  // Only check Bash tool
  if (input.tool_name !== "Bash") {
    process.exit(0);
  }

  const command = input.tool_input?.command || "";
  if (!command) {
    process.exit(0);
  }

  const result = checkCommand(command, config);

  if (result.blocked) {
    console.error(`SECURITY: Blocked ${result.reason}: ${command}`);
    process.exit(2);
  }

  if (result.ask) {
    // Output JSON for ask dialog
    console.log(JSON.stringify({ action: "ask", reason: result.reason }));
    process.exit(0);
  }

  // Allow command
  process.exit(0);
}

// Only run main when executed directly
if (import.meta.main) {
  main().catch((e) => {
    console.error(`Hook error: ${e}`);
    process.exit(0); // Fail open to avoid blocking all commands
  });
}

// Export for testing
export {
  isGlobPattern,
  globToRegex,
  expandPath,
  matchPath,
  extractPathsFromCommand,
  detectOperation,
  checkCommand,
  type CheckResult,
  type Config,
};
