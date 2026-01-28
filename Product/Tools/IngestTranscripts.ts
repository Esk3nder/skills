#!/usr/bin/env bun
/**
 * IngestTranscripts.ts - Ingest LennyHub transcripts into LanceDB
 *
 * Usage:
 *   bun run IngestTranscripts.ts              # Ingest all transcripts
 *   bun run IngestTranscripts.ts --reset      # Clear and re-ingest
 *   bun run IngestTranscripts.ts --limit 10   # Process only N files (for testing)
 *   bun run IngestTranscripts.ts --stats      # Show stats only, don't ingest
 */

import { parseArgs } from "util";
import * as path from "path";
import * as fs from "fs/promises";
import { connect, type Table } from "@lancedb/lancedb";
import { checkOllama, embedBatch, getEmbeddingDimensions } from "./lib/embeddings";

// Configuration
const TRANSCRIPTS_DIR = process.env.LENNYHUB_DATA || "/home/skish/lennyhub-rag/data";
const LANCEDB_PATH = process.env.LANCEDB_PATH || path.join(process.env.HOME || "~", ".pm-toolkit", "lennyhub.lance");
const TABLE_NAME = "transcripts";

// Speaker turn pattern: "Speaker Name (HH:MM:SS):" or "Speaker Name (MM:SS):"
const SPEAKER_PATTERN = /^([A-Za-z][A-Za-z\s.'-]+?)\s*\((\d{1,2}:\d{2}(?::\d{2})?)\):\s*$/;

interface Chunk {
  id: string;
  text: string;
  speaker: string;
  episode: string;
  timestamp: string;
  file: string;
}

interface ChunkWithVector extends Chunk {
  vector: number[];
}

// Parse command line arguments
const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    reset: { type: "boolean", default: false },
    limit: { type: "string", short: "l" },
    stats: { type: "boolean", default: false },
    help: { type: "boolean", short: "h" },
  },
});

if (values.help) {
  console.log(`
IngestTranscripts - Index LennyHub transcripts for semantic search

Usage:
  bun run IngestTranscripts.ts [options]

Options:
  --reset       Clear existing index and re-ingest all
  -l, --limit   Process only N files (for testing)
  --stats       Show statistics only, don't ingest
  -h, --help    Show this help

Environment:
  LENNYHUB_DATA   Transcripts directory (default: /home/skish/lennyhub-rag/data)
  LANCEDB_PATH    LanceDB storage path (default: ~/.pm-toolkit/lennyhub.lance)
  OLLAMA_URL      Ollama server URL (default: http://localhost:11434)

Prerequisites:
  - Ollama running: ollama serve
  - Model pulled: ollama pull nomic-embed-text
`);
  process.exit(0);
}

/**
 * Parse a transcript file into chunks by speaker turn
 */
function parseTranscript(content: string, filename: string): Chunk[] {
  const chunks: Chunk[] = [];
  const lines = content.split("\n");
  const episode = path.basename(filename, ".txt");

  let currentSpeaker = "";
  let currentTimestamp = "";
  let currentText: string[] = [];

  function saveChunk() {
    if (currentSpeaker && currentText.length > 0) {
      const text = currentText.join("\n").trim();
      if (text.length > 50) {
        // Skip very short chunks
        chunks.push({
          id: `${episode}-${currentTimestamp}-${currentSpeaker}`.replace(/[^a-zA-Z0-9-]/g, "_"),
          text,
          speaker: currentSpeaker,
          episode,
          timestamp: currentTimestamp,
          file: filename,
        });
      }
    }
    currentText = [];
  }

  for (const line of lines) {
    const match = line.match(SPEAKER_PATTERN);
    if (match) {
      // Save previous chunk
      saveChunk();
      // Start new chunk
      currentSpeaker = match[1].trim();
      currentTimestamp = match[2];
    } else if (line.trim()) {
      currentText.push(line.trim());
    }
  }

  // Save final chunk
  saveChunk();

  return chunks;
}

/**
 * Get all transcript files
 */
async function getTranscriptFiles(limit?: number): Promise<string[]> {
  const files = await fs.readdir(TRANSCRIPTS_DIR);
  let txtFiles = files.filter((f) => f.endsWith(".txt")).map((f) => path.join(TRANSCRIPTS_DIR, f));

  if (limit) {
    txtFiles = txtFiles.slice(0, limit);
  }

  return txtFiles;
}

/**
 * Show statistics about transcripts
 */
async function showStats() {
  const files = await getTranscriptFiles();
  console.log(`\n📊 Transcript Statistics\n${"=".repeat(40)}`);
  console.log(`Files: ${files.length}`);

  let totalChunks = 0;
  const speakers = new Set<string>();

  for (const file of files) {
    const content = await Bun.file(file).text();
    const chunks = parseTranscript(content, file);
    totalChunks += chunks.length;
    chunks.forEach((c) => speakers.add(c.speaker));
  }

  console.log(`Chunks: ${totalChunks}`);
  console.log(`Unique speakers: ${speakers.size}`);
  console.log(`\nTop speakers:`);

  // Count speaker frequency
  const speakerCounts: Record<string, number> = {};
  for (const file of files.slice(0, 50)) {
    // Sample first 50
    const content = await Bun.file(file).text();
    const chunks = parseTranscript(content, file);
    chunks.forEach((c) => {
      speakerCounts[c.speaker] = (speakerCounts[c.speaker] || 0) + 1;
    });
  }

  Object.entries(speakerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([speaker, count]) => {
      console.log(`  ${speaker}: ${count} chunks`);
    });
}

/**
 * Main ingestion function
 */
async function ingest() {
  console.log("🚀 LennyHub Transcript Ingestion\n");

  // Check Ollama availability
  console.log("Checking Ollama...");
  const ollamaStatus = await checkOllama();
  if (!ollamaStatus.available) {
    console.error(`❌ Ollama not available: ${ollamaStatus.error}`);
    console.error("   Start Ollama: ollama serve");
    process.exit(1);
  }
  if (!ollamaStatus.hasModel) {
    console.error("❌ nomic-embed-text model not found");
    console.error("   Pull model: ollama pull nomic-embed-text");
    process.exit(1);
  }
  console.log("✅ Ollama ready with nomic-embed-text\n");

  // Ensure LanceDB directory exists
  const lanceDir = path.dirname(LANCEDB_PATH);
  await fs.mkdir(lanceDir, { recursive: true });

  // Connect to LanceDB
  console.log(`Connecting to LanceDB at ${LANCEDB_PATH}...`);
  const db = await connect(LANCEDB_PATH);

  // Check if table exists and handle reset
  const tables = await db.tableNames();
  const tableExists = tables.includes(TABLE_NAME);

  if (tableExists && values.reset) {
    console.log("Dropping existing table...");
    await db.dropTable(TABLE_NAME);
  } else if (tableExists && !values.reset) {
    console.log("⚠️  Table already exists. Use --reset to re-ingest.");
    const table = await db.openTable(TABLE_NAME);
    const count = await table.countRows();
    console.log(`   Current rows: ${count}`);
    process.exit(0);
  }

  // Get transcript files
  const limit = values.limit ? parseInt(values.limit) : undefined;
  const files = await getTranscriptFiles(limit);
  console.log(`\nProcessing ${files.length} transcript files...\n`);

  // Parse all transcripts into chunks
  const allChunks: Chunk[] = [];
  for (const file of files) {
    const content = await Bun.file(file).text();
    const chunks = parseTranscript(content, file);
    allChunks.push(...chunks);
  }
  console.log(`Parsed ${allChunks.length} chunks from ${files.length} files\n`);

  // Generate embeddings in batches
  console.log("Generating embeddings...");
  const texts = allChunks.map((c) => `${c.speaker}: ${c.text}`);
  const embeddings = await embedBatch(texts, {
    onProgress: (completed, total) => {
      const pct = Math.round((completed / total) * 100);
      process.stdout.write(`\r  Progress: ${completed}/${total} (${pct}%)`);
    },
  });
  console.log("\n✅ Embeddings generated\n");

  // Combine chunks with vectors
  const chunksWithVectors: ChunkWithVector[] = allChunks.map((chunk, i) => ({
    ...chunk,
    vector: embeddings[i],
  }));

  // Create table and insert data
  console.log("Creating LanceDB table...");
  const table = await db.createTable(TABLE_NAME, chunksWithVectors);

  // Create vector index for fast search (requires 256+ rows for PQ)
  if (chunksWithVectors.length >= 256) {
    console.log("Creating vector index...");
    await table.createIndex("vector", {
      config: {
        type: "IVF_PQ",
        num_partitions: Math.min(16, Math.floor(chunksWithVectors.length / 256)),
        num_sub_vectors: 48,
      },
    });
  } else {
    console.log("Skipping index (need 256+ rows for PQ, using brute-force search)");
  }

  const finalCount = await table.countRows();
  console.log(`\n✅ Ingestion complete!`);
  console.log(`   Rows: ${finalCount}`);
  console.log(`   Path: ${LANCEDB_PATH}`);
  console.log(`\nTest with: bun run QueryLenny.ts -q "autonomous teams"`);
}

// Main
async function main() {
  if (values.stats) {
    await showStats();
  } else {
    await ingest();
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
