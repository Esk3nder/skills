#!/usr/bin/env bun
/**
 * QueryLenny.ts - RAG queries against LennyHub transcripts
 *
 * Uses semantic search via LanceDB + Ollama embeddings with keyword fallback.
 *
 * Usage:
 *   bun run QueryLenny.ts --query "how to prioritize roadmap"
 *   bun run QueryLenny.ts -q "stakeholder management" --limit 5
 *   bun run QueryLenny.ts --query "DHM model" --format json
 *   bun run QueryLenny.ts -q "autonomous teams" --keyword  # Force keyword search
 */

import { parseArgs } from "util";
import * as path from "path";
import { connect } from "@lancedb/lancedb";
import { checkOllama, embed } from "./lib/embeddings";

// Configuration
const TRANSCRIPTS_DIR = process.env.LENNYHUB_DATA || "/home/skish/lennyhub-rag/data";
const LANCEDB_PATH = process.env.LANCEDB_PATH || path.join(process.env.HOME || "~", ".pm-toolkit", "lennyhub.lance");
const TABLE_NAME = "transcripts";
const BEST_PRACTICES_FILES = [
  "/home/skish/canonical/prd-best-practices-lenny-podcast.md",
  "/home/skish/canonical/prd-best-practices-lenny-podcast-v2.md",
  "/home/skish/canonical/prd-best-practices-internet-v3.md",
];

interface SearchResult {
  content: string;
  source: string;
  score: number;
  speaker?: string;
  timestamp?: string;
}

// Parse command line arguments
const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    query: { type: "string", short: "q" },
    limit: { type: "string", short: "l", default: "5" },
    format: { type: "string", short: "f", default: "text" },
    keyword: { type: "boolean", short: "k", default: false },
    speaker: { type: "string", short: "s" },
    help: { type: "boolean", short: "h" },
  },
});

if (values.help || !values.query) {
  console.log(`
QueryLenny - Search Lenny's Podcast transcripts via RAG

Usage:
  bun run QueryLenny.ts --query "your question" [options]

Options:
  -q, --query     Search query (required)
  -l, --limit     Number of results (default: 5)
  -f, --format    Output format: text, json, markdown (default: text)
  -k, --keyword   Force keyword search (skip semantic)
  -s, --speaker   Filter by speaker name
  -h, --help      Show this help

Search Modes:
  Semantic (default): Uses Ollama + LanceDB for concept-based search
  Keyword (fallback): Grep-based search when semantic unavailable

Prerequisites for semantic search:
  1. Ollama running: ollama serve
  2. Model pulled: ollama pull nomic-embed-text
  3. Index built: bun run IngestTranscripts.ts

Examples:
  bun run QueryLenny.ts -q "how to prioritize roadmap"
  bun run QueryLenny.ts --query "stakeholder conflicts" --limit 10
  bun run QueryLenny.ts -q "DHM model" -f json
  bun run QueryLenny.ts -q "autonomous teams" --speaker "Marty Cagan"
`);
  process.exit(0);
}

const query = values.query!;
const limit = parseInt(values.limit || "5");
const format = values.format || "text";
const forceKeyword = values.keyword || false;
const speakerFilter = values.speaker;

/**
 * Check if LanceDB index exists
 */
async function checkLanceDB(): Promise<boolean> {
  try {
    const db = await connect(LANCEDB_PATH);
    const tables = await db.tableNames();
    return tables.includes(TABLE_NAME);
  } catch {
    return false;
  }
}

/**
 * Semantic search using LanceDB
 */
async function semanticSearch(queryText: string, topK: number): Promise<SearchResult[]> {
  // Generate query embedding
  const queryVector = await embed(queryText);

  // Connect and search
  const db = await connect(LANCEDB_PATH);
  const table = await db.openTable(TABLE_NAME);

  // Build search query
  let searchQuery = table.search(queryVector).limit(topK * 2); // Over-fetch for filtering

  // Apply speaker filter if specified
  if (speakerFilter) {
    searchQuery = searchQuery.where(`speaker LIKE '%${speakerFilter}%'`);
  }

  const results = await searchQuery.toArray();

  return results.slice(0, topK).map((row) => ({
    content: row.text as string,
    source: row.episode as string,
    score: 1 - (row._distance as number), // Convert distance to similarity
    speaker: row.speaker as string,
    timestamp: row.timestamp as string,
  }));
}

/**
 * Fallback: keyword grep search through transcripts
 */
async function keywordSearch(queryText: string, topK: number): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const keywords = queryText.toLowerCase().split(/\s+/).filter((w) => w.length > 3);

  try {
    // Get list of transcript files
    const proc = Bun.spawn(["find", TRANSCRIPTS_DIR, "-name", "*.txt", "-type", "f"], {
      stdout: "pipe",
    });
    const output = await new Response(proc.stdout).text();
    const files = output.trim().split("\n").filter(Boolean);

    for (const file of files) {
      try {
        const content = await Bun.file(file).text();
        const lines = content.split("\n");

        // Score file by keyword matches
        let score = 0;
        const matchingLines: string[] = [];
        let lastSpeaker = "";

        for (const line of lines) {
          // Track speaker
          const speakerMatch = line.match(/^([A-Za-z][A-Za-z\s.'-]+?)\s*\((\d{1,2}:\d{2}(?::\d{2})?)\):\s*$/);
          if (speakerMatch) {
            lastSpeaker = speakerMatch[1].trim();
            continue;
          }

          // Apply speaker filter
          if (speakerFilter && !lastSpeaker.toLowerCase().includes(speakerFilter.toLowerCase())) {
            continue;
          }

          const lowerLine = line.toLowerCase();
          let lineScore = 0;

          for (const keyword of keywords) {
            if (lowerLine.includes(keyword)) {
              lineScore += 1;
            }
          }

          if (lineScore > 0) {
            score += lineScore;
            matchingLines.push(line.trim());
          }
        }

        if (score > 0 && matchingLines.length > 0) {
          results.push({
            content: matchingLines.slice(0, 5).join("\n"),
            source: path.basename(file, ".txt"),
            score: score / keywords.length,
            speaker: lastSpeaker || undefined,
          });
        }
      } catch {
        // Skip files that can't be read
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  } catch (error) {
    console.error("Error searching transcripts:", error);
    return [];
  }
}

/**
 * Search best practices files
 */
async function searchBestPractices(queryText: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const keywords = queryText.toLowerCase().split(/\s+/).filter((w) => w.length > 3);

  for (const filePath of BEST_PRACTICES_FILES) {
    try {
      const content = await Bun.file(filePath).text();
      const sections = content.split(/^## /m);

      for (const section of sections) {
        const lowerSection = section.toLowerCase();
        let score = 0;

        for (const keyword of keywords) {
          if (lowerSection.includes(keyword)) {
            score += 1;
          }
        }

        if (score > 0) {
          // Extract quotes from section
          const quotes = section.match(/> "[^"]+"/g) || [];
          const speakerMatch = section.match(/— \*\*([^*]+)\*\*/);

          results.push({
            content: quotes.length > 0 ? quotes.join("\n") : section.slice(0, 500),
            source: path.basename(filePath),
            score: score / keywords.length,
            speaker: speakerMatch ? speakerMatch[1] : undefined,
          });
        }
      }
    } catch {
      // Skip files that can't be read
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 3);
}

/**
 * Format results for output
 */
function formatResults(results: SearchResult[], format: string, searchMode: string): string {
  if (format === "json") {
    return JSON.stringify({ searchMode, results }, null, 2);
  }

  if (format === "markdown") {
    let output = `## Search Results for: "${query}"\n`;
    output += `*Search mode: ${searchMode}*\n\n`;

    for (const [i, result] of results.entries()) {
      output += `### ${i + 1}. ${result.source}\n`;
      if (result.speaker) {
        output += `**Speaker:** ${result.speaker}`;
        if (result.timestamp) {
          output += ` (${result.timestamp})`;
        }
        output += "\n";
      }
      output += `**Relevance:** ${(result.score * 100).toFixed(0)}%\n\n`;
      output += `${result.content}\n\n---\n\n`;
    }

    return output;
  }

  // Default: text format
  let output = `\n=== Results for: "${query}" ===\n`;
  output += `[${searchMode} search]\n\n`;

  for (const [i, result] of results.entries()) {
    output += `[${i + 1}] ${result.source}`;
    if (result.speaker) {
      output += ` (${result.speaker}`;
      if (result.timestamp) {
        output += ` @ ${result.timestamp}`;
      }
      output += `)`;
    }
    output += `\n`;
    output += `    Score: ${(result.score * 100).toFixed(0)}%\n`;
    output += `    ${result.content.split("\n")[0].slice(0, 100)}...\n\n`;
  }

  return output;
}

// Main execution
async function main() {
  console.log(`Searching for: "${query}"...\n`);

  let results: SearchResult[] = [];
  let searchMode = "keyword";

  // Determine search mode
  if (!forceKeyword) {
    const [ollamaStatus, lancedbExists] = await Promise.all([checkOllama(), checkLanceDB()]);

    if (ollamaStatus.available && ollamaStatus.hasModel && lancedbExists) {
      // Use semantic search
      try {
        results = await semanticSearch(query, limit);
        searchMode = "semantic";
      } catch (err) {
        console.error("Semantic search failed, falling back to keyword:", err);
      }
    } else {
      // Log why semantic search unavailable
      if (!ollamaStatus.available) {
        console.error("Note: Ollama not running. Start with: ollama serve");
      } else if (!ollamaStatus.hasModel) {
        console.error("Note: nomic-embed-text not found. Pull with: ollama pull nomic-embed-text");
      } else if (!lancedbExists) {
        console.error("Note: LanceDB index not found. Build with: bun run IngestTranscripts.ts");
      }
      console.error("Using keyword fallback...\n");
    }
  }

  // Keyword fallback
  if (results.length === 0) {
    results = await keywordSearch(query, limit);
    searchMode = "keyword";
  }

  // Also search best practices
  const bpResults = await searchBestPractices(query);

  // Combine results (best practices first as they're curated)
  const allResults = [...bpResults, ...results];

  if (allResults.length === 0) {
    console.log("No results found.");
    process.exit(0);
  }

  console.log(formatResults(allResults.slice(0, limit), format, searchMode));
}

main().catch(console.error);
