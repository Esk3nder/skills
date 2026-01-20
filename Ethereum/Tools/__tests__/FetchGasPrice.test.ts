import { describe, test, expect } from "bun:test";
import { $ } from "bun";
import { join } from "path";

const TOOL_PATH = join(import.meta.dir, "..", "FetchGasPrice.ts");

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

describe("FetchGasPrice", () => {
  describe("--help flag", () => {
    test("shows help information", async () => {
      const result = await runTool(["--help"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("FetchGasPrice");
      expect(result.stdout).toContain("--format");
      expect(result.stdout).toContain("--include-blob-fee");
      expect(result.stdout).toContain("--json");
      expect(result.stdout).toContain("ETHEREUM_RPC_URL");
    });
  });

  describe("basic functionality", () => {
    test("fetches and displays gas prices", async () => {
      const result = await runTool([]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Ethereum Gas Prices");
      expect(result.stdout).toContain("Block");
      expect(result.stdout).toContain("Base Fee:");
      expect(result.stdout).toContain("Priority Fee:");
      expect(result.stdout).toContain("gwei");
    }, 30000);

    test("shows estimated costs for common operations", async () => {
      const result = await runTool([]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("ETH Transfer");
      expect(result.stdout).toContain("ERC20 Transfer");
      expect(result.stdout).toContain("Uniswap Swap");
      expect(result.stdout).toContain("USD");
    }, 30000);
  });

  describe("--format flag", () => {
    test("displays prices in gwei (default)", async () => {
      const result = await runTool(["--format", "gwei"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("gwei");
    }, 30000);

    test("displays prices in wei", async () => {
      const result = await runTool(["--format", "wei"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("wei");
      // Wei values should be much larger numbers (no decimal point in fee display)
    }, 30000);
  });

  describe("--json flag", () => {
    test("outputs valid JSON", async () => {
      const result = await runTool(["--json"]);

      expect(result.exitCode).toBe(0);
      const json = JSON.parse(result.stdout);
      expect(json).toHaveProperty("blockNumber");
      expect(json).toHaveProperty("baseFeeGwei");
      expect(json).toHaveProperty("priorityFeeGwei");
      expect(json).toHaveProperty("totalGwei");
    }, 30000);
  });

  describe("--include-blob-fee flag", () => {
    test("includes blob base fee in output", async () => {
      const result = await runTool(["--include-blob-fee"]);

      expect(result.exitCode).toBe(0);
      // Should mention blob fee (either showing value or "Not available")
      expect(result.stdout).toContain("Blob Base Fee");
    }, 30000);

    test("includes blob fee in JSON output", async () => {
      const result = await runTool(["--json", "--include-blob-fee"]);

      expect(result.exitCode).toBe(0);
      const json = JSON.parse(result.stdout);
      expect(json).toHaveProperty("blobBaseFeeGwei");
    }, 30000);
  });
});
