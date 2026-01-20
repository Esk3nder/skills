// $PAI_DIR/skills/EthereumSME/Tools/FetchEIPs.ts
// Fetch latest Ethereum Improvement Proposals from GitHub
// Usage: bun run FetchEIPs.ts [options]

import { parseArgs } from "util";

const GITHUB_API = "https://api.github.com";
const EIP_REPO = "ethereum/EIPs";

interface EIPMetadata {
  eip: number;
  title: string;
  status: string;
  type: string;
  category?: string;
  created: string;
  requires?: number[];
}

interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  download_url: string;
}

async function fetchEIPList(): Promise<GitHubFile[]> {
  const response = await fetch(
    `${GITHUB_API}/repos/${EIP_REPO}/contents/EIPS`,
    {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "PAI-EthereumSME",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  return response.json();
}

async function fetchEIPContent(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch EIP: ${response.status}`);
  }
  return response.text();
}

function parseEIPFrontmatter(content: string): EIPMetadata | null {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return null;

  const frontmatter = frontmatterMatch[1];
  const metadata: Partial<EIPMetadata> = {};

  const lines = frontmatter.split("\n");
  for (const line of lines) {
    const [key, ...valueParts] = line.split(":");
    if (!key || valueParts.length === 0) continue;

    const value = valueParts.join(":").trim();
    switch (key.trim().toLowerCase()) {
      case "eip":
        metadata.eip = parseInt(value, 10);
        break;
      case "title":
        metadata.title = value.replace(/^["']|["']$/g, "");
        break;
      case "status":
        metadata.status = value;
        break;
      case "type":
        metadata.type = value;
        break;
      case "category":
        metadata.category = value;
        break;
      case "created":
        metadata.created = value;
        break;
      case "requires":
        metadata.requires = value.split(",").map((n) => parseInt(n.trim(), 10));
        break;
    }
  }

  return metadata as EIPMetadata;
}

// EIPs that affect EVM execution
const EVM_AFFECTING_EIPS = new Set([
  // Dencun
  1153, // Transient storage (TLOAD, TSTORE)
  4788, // Beacon block root in EVM
  4844, // Blob transactions (BLOBHASH, BLOBBASEFEE)
  5656, // MCOPY
  6780, // SELFDESTRUCT only in same transaction
  7516, // BLOBBASEFEE opcode
  // Shanghai
  3651, // Warm COINBASE
  3855, // PUSH0
  3860, // Limit initcode size
  // London
  1559, // Fee market (BASEFEE)
  3198, // BASEFEE opcode
  3529, // Reduce refunds
  // Berlin
  2565, // ModExp gas cost
  2718, // Typed transactions
  2929, // Cold/warm access
  2930, // Access lists
  // Istanbul
  1344, // CHAINID opcode
  1884, // Gas repricing
  2028, // Calldata gas
  2200, // SSTORE gas
]);

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      status: { type: "string", short: "s" },
      category: { type: "string", short: "c" },
      type: { type: "string", short: "t" },
      since: { type: "string" },
      "affects-evm": { type: "boolean" },
      limit: { type: "string", short: "l", default: "20" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(`
FetchEIPs - Query Ethereum Improvement Proposals

Usage: bun run FetchEIPs.ts [options]

Options:
  -s, --status <status>    Filter by status (Draft, Review, Last Call, Final, Stagnant, Withdrawn)
  -c, --category <cat>     Filter by category (Core, Networking, Interface, ERC)
  -t, --type <type>        Filter by type (Standards Track, Meta, Informational)
  --since <date>           Only EIPs created after date (YYYY-MM-DD)
  --affects-evm            Only EIPs that affect EVM execution
  -l, --limit <n>          Max results (default: 20)
  -h, --help               Show this help

Examples:
  bun run FetchEIPs.ts --status Final --category Core
  bun run FetchEIPs.ts --affects-evm
  bun run FetchEIPs.ts --since 2024-01-01
  bun run FetchEIPs.ts --category ERC --limit 10
`);
    process.exit(0);
  }

  console.log("Fetching EIP list from GitHub...");

  const files = await fetchEIPList();
  const eipFiles = files.filter(
    (f) => f.name.startsWith("eip-") && f.name.endsWith(".md")
  );

  console.log(`Found ${eipFiles.length} EIPs, filtering...\n`);

  const results: EIPMetadata[] = [];
  const limit = parseInt(values.limit || "20", 10);
  const sinceDate = values.since ? new Date(values.since) : null;

  for (const file of eipFiles) {
    if (results.length >= limit * 3) break; // Fetch extra to account for filtering

    const eipNum = parseInt(file.name.replace("eip-", "").replace(".md", ""), 10);

    // Early filter for affects-evm
    if (values["affects-evm"] && !EVM_AFFECTING_EIPS.has(eipNum)) {
      continue;
    }

    try {
      const content = await fetchEIPContent(file.download_url);
      const metadata = parseEIPFrontmatter(content);

      if (!metadata) continue;

      // Apply filters
      if (values.status && metadata.status !== values.status) continue;
      if (values.category && metadata.category !== values.category) continue;
      if (values.type && metadata.type !== values.type) continue;
      if (sinceDate && new Date(metadata.created) < sinceDate) continue;

      results.push(metadata);

      if (results.length >= limit) break;
    } catch (e) {
      // Skip failed fetches
    }
  }

  // Sort by EIP number descending (newest first)
  results.sort((a, b) => b.eip - a.eip);

  // Output results
  console.log("Results:\n");
  console.log("EIP".padEnd(8) + "Status".padEnd(12) + "Category".padEnd(12) + "Title");
  console.log("-".repeat(80));

  for (const eip of results.slice(0, limit)) {
    const eipStr = `EIP-${eip.eip}`.padEnd(8);
    const status = (eip.status || "").padEnd(12);
    const category = (eip.category || eip.type || "").padEnd(12);
    console.log(`${eipStr}${status}${category}${eip.title}`);
  }

  console.log(`\nShowing ${Math.min(results.length, limit)} of ${results.length} matching EIPs`);
}

main().catch(console.error);
