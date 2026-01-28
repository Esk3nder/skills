#!/usr/bin/env bun
/**
 * Writing Style System - Search Tool
 *
 * Semantic search over corpus embeddings using cosine similarity.
 *
 * Usage:
 *   bun run Search.ts "query text" [--top-k 10] [--threshold 0.5]
 *
 * Example:
 *   bun run Search.ts "MEV protection strategies" --top-k 5
 *   bun run Search.ts "DeFi yield farming risks" --threshold 0.6
 */

import { readFile } from "fs/promises";
import { join } from "path";
import { pipeline, env } from "@xenova/transformers";

env.allowLocalModels = false;

interface EmbeddingRecord {
  docId: string;
  chunkIndex: number;
  text: string;
  title: string | null;
  source: string;
  embedding: number[];
}

interface VectorIndex {
  version: string;
  model: string;
  dimensions: number;
  createdAt: string;
  documentCount: number;
  chunkCount: number;
  embeddings: EmbeddingRecord[];
}

interface SearchResult {
  docId: string;
  chunkIndex: number;
  title: string | null;
  text: string;
  source: string;
  score: number;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function deduplicateByDocument(results: SearchResult[], maxPerDoc: number = 2): SearchResult[] {
  const docCounts = new Map<string, number>();
  const filtered: SearchResult[] = [];

  for (const result of results) {
    const count = docCounts.get(result.docId) || 0;
    if (count < maxPerDoc) {
      filtered.push(result);
      docCounts.set(result.docId, count + 1);
    }
  }

  return filtered;
}

async function search(
  query: string,
  index: VectorIndex,
  extractor: any,
  topK: number = 10,
  threshold: number = 0.3
): Promise<SearchResult[]> {
  // Generate query embedding
  const queryOutput = await extractor(query, { pooling: "mean", normalize: true });
  const queryEmbedding = Array.from(queryOutput.data as Float32Array);

  // Calculate similarities
  const results: SearchResult[] = [];

  for (const record of index.embeddings) {
    const score = cosineSimilarity(queryEmbedding, record.embedding);

    if (score >= threshold) {
      results.push({
        docId: record.docId,
        chunkIndex: record.chunkIndex,
        title: record.title,
        text: record.text,
        source: record.source,
        score,
      });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  // Deduplicate (max 2 chunks per document)
  const deduplicated = deduplicateByDocument(results, 2);

  return deduplicated.slice(0, topK);
}

function formatResults(results: SearchResult[], query: string): string {
  if (results.length === 0) {
    return `No results found for: "${query}"`;
  }

  let output = `\n=== Search Results for: "${query}" ===\n`;
  output += `Found ${results.length} relevant chunks\n\n`;

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const scorePercent = (r.score * 100).toFixed(1);
    const chunkType = r.chunkIndex === -1 ? "summary" : `chunk ${r.chunkIndex}`;

    output += `${i + 1}. [${scorePercent}%] ${r.title || r.docId} (${chunkType})\n`;
    output += `   ${r.text.slice(0, 150)}${r.text.length > 150 ? "..." : ""}\n`;
    output += `   Source: ${r.source.split("/").slice(-2).join("/")}\n\n`;
  }

  return output;
}

function formatJSON(results: SearchResult[]): string {
  return JSON.stringify(
    results.map((r) => ({
      docId: r.docId,
      title: r.title,
      score: r.score,
      text: r.text,
      source: r.source,
    })),
    null,
    2
  );
}

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let query = "";
  let topK = 10;
  let threshold = 0.3;
  let jsonOutput = false;
  let vectorDir = join(process.env.HOME!, "writing-system", "vectors");

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--top-k" && args[i + 1]) {
      topK = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === "--threshold" && args[i + 1]) {
      threshold = parseFloat(args[i + 1]);
      i++;
    } else if (args[i] === "--json") {
      jsonOutput = true;
    } else if (args[i] === "--vectors" && args[i + 1]) {
      vectorDir = args[i + 1];
      i++;
    } else if (!args[i].startsWith("--")) {
      query = args[i];
    }
  }

  if (!query) {
    console.log("Usage: bun run Search.ts \"query text\" [options]");
    console.log("\nOptions:");
    console.log("  --top-k N       Return top N results (default: 10)");
    console.log("  --threshold N   Minimum similarity score (default: 0.3)");
    console.log("  --json          Output as JSON");
    console.log("  --vectors DIR   Vector index directory");
    console.log("\nExamples:");
    console.log('  bun run Search.ts "MEV protection" --top-k 5');
    console.log('  bun run Search.ts "yield farming risks" --json');
    process.exit(1);
  }

  // Load index
  const indexPath = join(vectorDir, "embeddings.json");
  let index: VectorIndex;

  try {
    const content = await readFile(indexPath, "utf-8");
    index = JSON.parse(content);
  } catch (error) {
    console.error(`Error: Vector index not found at ${indexPath}`);
    console.error("Run 'bun run Embed.ts' first to generate embeddings.");
    process.exit(1);
  }

  if (!jsonOutput) {
    console.log(`Loaded ${index.chunkCount} chunks from ${index.documentCount} documents`);
    console.log("Loading embedding model...");
  }

  // Load model
  const extractor = await pipeline("feature-extraction", index.model);

  if (!jsonOutput) {
    console.log("Searching...");
  }

  // Search
  const results = await search(query, index, extractor, topK, threshold);

  // Output
  if (jsonOutput) {
    console.log(formatJSON(results));
  } else {
    console.log(formatResults(results, query));
  }
}

main().catch(console.error);
