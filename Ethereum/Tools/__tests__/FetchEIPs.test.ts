import { describe, test, expect } from "bun:test";
import { $ } from "bun";
import { join } from "path";

const TOOL_PATH = join(import.meta.dir, "..", "FetchEIPs.ts");

async function runTool(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const result = await $`~/.bun/bin/bun run ${TOOL_PATH} ${args}`.quiet();
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

describe("FetchEIPs", () => {
  describe("--help flag", () => {
    test("shows help information", async () => {
      const result = await runTool(["--help"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("FetchEIPs");
      expect(result.stdout).toContain("--status");
      expect(result.stdout).toContain("--category");
      expect(result.stdout).toContain("--affects-evm");
      expect(result.stdout).toContain("--since");
      expect(result.stdout).toContain("--limit");
    });
  });

  describe("--affects-evm flag", () => {
    test("returns only EVM-affecting EIPs", async () => {
      const result = await runTool(["--affects-evm", "--limit", "5"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Results:");
      // Should contain known EVM-affecting EIPs
      // These are hardcoded in EVM_AFFECTING_EIPS set
      const output = result.stdout;
      // At least one of these should appear (Dencun EIPs)
      const hasKnownEVMEip =
        output.includes("EIP-1153") || // Transient storage
        output.includes("EIP-4844") || // Blob transactions
        output.includes("EIP-5656") || // MCOPY
        output.includes("EIP-3855");   // PUSH0

      expect(hasKnownEVMEip).toBe(true);
    }, 30000); // 30s timeout for network request
  });

  describe("--status flag", () => {
    test("filters by Final status", async () => {
      const result = await runTool(["--status", "Final", "--limit", "3"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Final");
    }, 30000);
  });

  describe("--category flag", () => {
    test("filters by ERC category", async () => {
      const result = await runTool(["--category", "ERC", "--limit", "3"]);

      expect(result.exitCode).toBe(0);
      // ERCs should appear in the output
      expect(result.stdout).toContain("EIP-");
    }, 30000);
  });

  describe("--limit flag", () => {
    test("respects limit parameter", async () => {
      const result = await runTool(["--limit", "2"]);

      expect(result.exitCode).toBe(0);
      // Count EIP- occurrences in results section
      const lines = result.stdout.split("\n");
      const eipLines = lines.filter(
        (line) => line.startsWith("EIP-") && !line.includes("Usage")
      );
      expect(eipLines.length).toBeLessThanOrEqual(2);
    }, 30000);
  });

  describe("basic functionality", () => {
    test("fetches and displays EIPs", async () => {
      const result = await runTool(["--limit", "3"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Fetching EIP list from GitHub");
      expect(result.stdout).toContain("Found");
      expect(result.stdout).toContain("Results:");
    }, 30000);
  });
});
