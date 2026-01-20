// $PAI_DIR/skills/EthereumSME/Tools/FetchGasPrice.ts
// Fetch current Ethereum network gas prices
// Usage: bun run FetchGasPrice.ts [options]

import { parseArgs } from "util";
import { join } from "path";
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";

const PAI_DIR = process.env.PAI_DIR || join(homedir(), ".claude");

// Public RPC endpoints (no API key required)
const PUBLIC_RPCS = [
  "https://eth.llamarpc.com",
  "https://cloudflare-eth.com",
  "https://ethereum.publicnode.com",
  "https://eth.drpc.org",
  "https://rpc.eth.gateway.fm",
];

interface GasPrices {
  baseFee: bigint;
  priorityFee: bigint;
  blobBaseFee?: bigint;
  blockNumber: number;
}

function getRpcUrl(): string {
  // Check for custom RPC in environment
  if (process.env.ETHEREUM_RPC_URL) {
    return process.env.ETHEREUM_RPC_URL;
  }

  // Check .env file
  const envPath = join(PAI_DIR, ".env");
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, "utf-8");
    const match = content.match(/ETHEREUM_RPC_URL=(.+)/);
    if (match) return match[1].trim();
  }

  // Return random public RPC
  return PUBLIC_RPCS[Math.floor(Math.random() * PUBLIC_RPCS.length)];
}

async function rpcCall(url: string, method: string, params: any[] = []): Promise<any> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC error: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(`RPC error: ${data.error.message}`);
  }

  return data.result;
}

async function fetchGasPrices(rpcUrl: string): Promise<GasPrices> {
  // Fetch latest block
  const block = await rpcCall(rpcUrl, "eth_getBlockByNumber", ["latest", false]);

  const baseFee = BigInt(block.baseFeePerGas || "0");
  const blockNumber = parseInt(block.number, 16);

  // Fetch max priority fee (tip)
  const priorityFeeHex = await rpcCall(rpcUrl, "eth_maxPriorityFeePerGas", []);
  const priorityFee = BigInt(priorityFeeHex);

  // Fetch blob base fee (Dencun - may not be available on all RPCs)
  let blobBaseFee: bigint | undefined;
  if (block.blobGasUsed !== undefined) {
    // Calculate blob base fee from excess blob gas
    // blob_base_fee = MIN_BLOB_BASE_FEE * e^(excess_blob_gas / BLOB_BASE_FEE_UPDATE_FRACTION)
    const excessBlobGas = BigInt(block.excessBlobGas || "0");
    const MIN_BLOB_BASE_FEE = 1n;
    const BLOB_BASE_FEE_UPDATE_FRACTION = 3338477n;

    // Simplified approximation (actual uses exponential)
    if (excessBlobGas > 0n) {
      // More accurate calculation using integer math
      const factor = (excessBlobGas * 1000000n) / BLOB_BASE_FEE_UPDATE_FRACTION;
      blobBaseFee = MIN_BLOB_BASE_FEE + (MIN_BLOB_BASE_FEE * factor) / 1000000n;
    } else {
      blobBaseFee = MIN_BLOB_BASE_FEE;
    }
  }

  return { baseFee, priorityFee, blobBaseFee, blockNumber };
}

function formatGwei(wei: bigint): string {
  const gwei = Number(wei) / 1e9;
  return gwei.toFixed(2);
}

function formatWei(wei: bigint): string {
  return wei.toString();
}

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      format: { type: "string", short: "f", default: "gwei" },
      "include-blob-fee": { type: "boolean", short: "b" },
      json: { type: "boolean", short: "j" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(`
FetchGasPrice - Get current Ethereum network gas prices

Usage: bun run FetchGasPrice.ts [options]

Options:
  -f, --format <format>    Output format: gwei (default) or wei
  -b, --include-blob-fee   Include blob base fee (EIP-4844)
  -j, --json               Output as JSON
  -h, --help               Show this help

Environment:
  ETHEREUM_RPC_URL         Custom RPC endpoint (optional)

Examples:
  bun run FetchGasPrice.ts
  bun run FetchGasPrice.ts --format wei
  bun run FetchGasPrice.ts --include-blob-fee
  bun run FetchGasPrice.ts --json
`);
    process.exit(0);
  }

  const rpcUrl = getRpcUrl();
  const prices = await fetchGasPrices(rpcUrl);

  const format = values.format === "wei" ? formatWei : formatGwei;
  const unit = values.format === "wei" ? "wei" : "gwei";

  if (values.json) {
    const output: Record<string, string | number> = {
      blockNumber: prices.blockNumber,
      baseFeeGwei: formatGwei(prices.baseFee),
      priorityFeeGwei: formatGwei(prices.priorityFee),
      totalGwei: formatGwei(prices.baseFee + prices.priorityFee),
    };
    if (values["include-blob-fee"] && prices.blobBaseFee !== undefined) {
      output.blobBaseFeeGwei = formatGwei(prices.blobBaseFee);
    }
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  console.log(`\nEthereum Gas Prices (Block ${prices.blockNumber})\n`);
  console.log("-".repeat(40));
  console.log(`Base Fee:       ${format(prices.baseFee)} ${unit}`);
  console.log(`Priority Fee:   ${format(prices.priorityFee)} ${unit}`);
  console.log(`Total (base+tip): ${format(prices.baseFee + prices.priorityFee)} ${unit}`);

  if (values["include-blob-fee"]) {
    if (prices.blobBaseFee !== undefined) {
      console.log(`\nBlob Base Fee:  ${format(prices.blobBaseFee)} ${unit}`);
    } else {
      console.log("\nBlob Base Fee:  Not available (pre-Dencun block or RPC doesn't support)");
    }
  }

  // Calculate gas costs for common operations
  console.log("\n─".repeat(40));
  console.log("Estimated costs (at current gas prices):\n");

  const gasPrice = prices.baseFee + prices.priorityFee;
  const ethPrice = 3000; // Rough estimate, could fetch from oracle

  const operations = [
    { name: "ETH Transfer", gas: 21000n },
    { name: "ERC20 Transfer", gas: 65000n },
    { name: "Uniswap Swap", gas: 150000n },
    { name: "NFT Mint", gas: 100000n },
    { name: "Contract Deploy (small)", gas: 500000n },
  ];

  for (const op of operations) {
    const costWei = gasPrice * op.gas;
    const costEth = Number(costWei) / 1e18;
    const costUsd = costEth * ethPrice;
    console.log(`  ${op.name.padEnd(24)} ${costUsd.toFixed(2)} USD`);
  }

  console.log(`\n(Assuming ~$${ethPrice} ETH price)\n`);
}

main().catch(console.error);
