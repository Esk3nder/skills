/**
 * DamageControl - Edit Tool Security Hook
 * ========================================
 *
 * PreToolUse hook that validates Edit tool file paths.
 * Blocks edits to protected paths (zeroAccess and readOnly).
 *
 * Exit codes:
 * 0 = Allow edit
 * 2 = Block edit (stderr fed back to Claude)
 */

import {
  loadDamageControlConfig,
  checkPathRestrictions,
} from "../../../hooks/lib/damage-control-config";

// Types
interface HookInput {
  tool_name: string;
  tool_input: {
    file_path?: string;
  };
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

  // Only check Edit tool
  if (input.tool_name !== "Edit") {
    process.exit(0);
  }

  const filePath = input.tool_input?.file_path || "";
  if (!filePath) {
    process.exit(0);
  }

  // Check path restrictions for edit operations
  const { blocked, reason } = checkPathRestrictions(filePath, config, ["write", "edit"]);

  if (blocked) {
    console.error(`SECURITY: Blocked edit to ${reason}: ${filePath}`);
    process.exit(2);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(`Hook error: ${e}`);
  process.exit(0); // Fail open
});
