import { describe, test, expect } from "bun:test";
import { $ } from "bun";
import { join } from "path";

const TOOL_PATH = join(import.meta.dir, "..", "DecodeOpcode.ts");

async function runTool(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const result = await $`bun run ${TOOL_PATH} ${args}`.quiet();
    return {
      stdout: result.stdout.toString(),
      stderr: result.stderr.toString(),
      exitCode: result.exitCode,
    };
  } catch (e: any) {
    return {
      stdout: e.stdout?.toString() || "",
      stderr: e.stderr?.toString() || "",
      exitCode: e.exitCode || 1,
    };
  }
}

describe("DecodeOpcode", () => {
  describe("--opcode flag", () => {
    test("decodes TLOAD (0x5C) with correct gas", async () => {
      const result = await runTool(["--opcode", "0x5c"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("TLOAD");
      expect(result.stdout).toContain("0x5C");
      expect(result.stdout).toContain("100 gas");
      expect(result.stdout).toContain("transient storage");
    });

    test("decodes SSTORE (0x55) with gas schedule", async () => {
      const result = await runTool(["--opcode", "0x55"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("SSTORE");
      expect(result.stdout).toContain("storage");
    });

    test("decodes BLOBHASH (0x49) - Dencun opcode", async () => {
      const result = await runTool(["--opcode", "0x49"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("BLOBHASH");
      expect(result.stdout).toContain("EIP-4844");
    });

    test("decodes PUSH0 (0x5F) - Shanghai opcode", async () => {
      const result = await runTool(["--opcode", "0x5f"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("PUSH0");
      expect(result.stdout).toContain("EIP-3855");
    });

    test("returns error for invalid opcode", async () => {
      // 0x0c is an undefined opcode (gap between 0x0b SIGNEXTEND and 0x10 LT)
      const result = await runTool(["--opcode", "0x0c"]);

      expect(result.stderr).toContain("Unknown opcode");
    });
  });

  describe("--name flag", () => {
    test("looks up ADD opcode by name", async () => {
      const result = await runTool(["--name", "ADD"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("ADD");
      expect(result.stdout).toContain("0x01");
      expect(result.stdout).toContain("Addition");
    });

    test("is case-insensitive", async () => {
      const result = await runTool(["--name", "sstore"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("SSTORE");
    });

    test("returns error for unknown name", async () => {
      const result = await runTool(["--name", "NOTANOPCODE"]);

      expect(result.stderr).toContain("Unknown opcode");
    });
  });

  describe("--bytecode flag", () => {
    test("disassembles simple bytecode", async () => {
      // PUSH1 0x01 PUSH1 0x00 SSTORE
      const result = await runTool(["--bytecode", "6001600055"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("PUSH1");
      expect(result.stdout).toContain("SSTORE");
      expect(result.stdout).toContain("0x01");
      expect(result.stdout).toContain("0x00");
    });

    test("handles 0x prefix", async () => {
      const result = await runTool(["--bytecode", "0x6001600055"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("PUSH1");
    });

    test("shows total byte count", async () => {
      const result = await runTool(["--bytecode", "6001600055"]);

      expect(result.stdout).toContain("5 bytes");
    });
  });

  describe("--list flag", () => {
    test("lists all opcodes", async () => {
      const result = await runTool(["--list"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("EVM Opcode Reference");
      expect(result.stdout).toContain("STOP");
      expect(result.stdout).toContain("ADD");
      expect(result.stdout).toContain("SSTORE");
    });
  });

  describe("--category flag", () => {
    test("shows storage category opcodes", async () => {
      const result = await runTool(["--category", "stack_memory_storage"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("SLOAD");
      expect(result.stdout).toContain("SSTORE");
      expect(result.stdout).toContain("MLOAD");
      expect(result.stdout).toContain("MSTORE");
    });

    test("shows category by partial match", async () => {
      const result = await runTool(["--category", "storage"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("SLOAD");
    });
  });

  describe("--help flag", () => {
    test("shows help information", async () => {
      const result = await runTool(["--help"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("DecodeOpcode");
      expect(result.stdout).toContain("USAGE");
      expect(result.stdout).toContain("--opcode");
      expect(result.stdout).toContain("--name");
      expect(result.stdout).toContain("--bytecode");
    });
  });
});
