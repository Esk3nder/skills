#!/usr/bin/env bun
/**
 * Writing Style System - Embed Tool
 *
 * Generates vector embeddings for corpus documents using local transformer models.
 * No external API required - runs entirely locally via @xenova/transformers.
 *
 * Usage:
 *   bun run Embed.ts [corpus-dir] [output-dir]
 *
 * Example:
 *   bun run Embed.ts ~/writing-system/corpus ~/writing-system/vectors
 */

import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { pipeline, env } from "@xenova/transformers";

// Disable local model check (use remote models from HuggingFace)
env.allowLocalModels = false;

interface ParsedDocument {
  id: string;
  source: string;
  content: string;
  metadata: {
    wordCount: number;
    sentenceCount: number;
  };
  parsed: {
    title: string | null;
    sentences: string[];
    paragraphs: string[];
  };
}

interface DocumentChunk {
  docId: string;
  chunkIndex: number;
  text: string;
  title: string | null;
  source: string;
  wordCount: number;
}

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

const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";
const EMBEDDING_DIM = 384;
const MAX_CHUNK_CHARS = 512;
const BATCH_SIZE = 32;

// Fast mode: only embed document summaries (1 per doc)
// Full mode: embed all paragraph chunks
let FAST_MODE = false;

function chunkDocument(doc: ParsedDocument): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];

  // Fast mode: only create summary chunk
  if (FAST_MODE) {
    const summaryText = [
      doc.parsed.title,
      doc.parsed.paragraphs.slice(0, 3).join(" "),
    ]
      .filter(Boolean)
      .join(": ")
      .slice(0, MAX_CHUNK_CHARS * 2);

    if (summaryText) {
      chunks.push({
        docId: doc.id,
        chunkIndex: -1,
        text: summaryText,
        title: doc.parsed.title,
        source: doc.source,
        wordCount: summaryText.split(/\s+/).length,
      });
    }
    return chunks;
  }

  // Full mode: Use paragraphs as natural chunks, split long ones
  for (const para of doc.parsed.paragraphs) {
    if (para.length <= MAX_CHUNK_CHARS) {
      chunks.push({
        docId: doc.id,
        chunkIndex: chunks.length,
        text: para,
        title: doc.parsed.title,
        source: doc.source,
        wordCount: para.split(/\s+/).length,
      });
    } else {
      // Split long paragraphs by sentences
      const sentences = para.split(/(?<=[.!?])\s+/);
      let currentChunk = "";

      for (const sentence of sentences) {
        if ((currentChunk + " " + sentence).length <= MAX_CHUNK_CHARS) {
          currentChunk = currentChunk ? currentChunk + " " + sentence : sentence;
        } else {
          if (currentChunk) {
            chunks.push({
              docId: doc.id,
              chunkIndex: chunks.length,
              text: currentChunk,
              title: doc.parsed.title,
              source: doc.source,
              wordCount: currentChunk.split(/\s+/).length,
            });
          }
          currentChunk = sentence;
        }
      }

      if (currentChunk) {
        chunks.push({
          docId: doc.id,
          chunkIndex: chunks.length,
          text: currentChunk,
          title: doc.parsed.title,
          source: doc.source,
          wordCount: currentChunk.split(/\s+/).length,
        });
      }
    }
  }

  // Also add document summary chunk (title + first paragraph)
  const summaryText = [doc.parsed.title, doc.parsed.paragraphs[0]]
    .filter(Boolean)
    .join(": ")
    .slice(0, MAX_CHUNK_CHARS);

  if (summaryText && !chunks.some((c) => c.text === summaryText)) {
    chunks.unshift({
      docId: doc.id,
      chunkIndex: -1, // Special index for summary
      text: summaryText,
      title: doc.parsed.title,
      source: doc.source,
      wordCount: summaryText.split(/\s+/).length,
    });
  }

  return chunks;
}

async function loadCorpus(corpusDir: string): Promise<ParsedDocument[]> {
  const structuredDir = join(corpusDir, "structured");
  const files = await readdir(structuredDir);
  const documents: ParsedDocument[] = [];

  for (const file of files) {
    if (file.endsWith(".json")) {
      const content = await readFile(join(structuredDir, file), "utf-8");
      documents.push(JSON.parse(content));
    }
  }

  return documents;
}

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let corpusDir = join(process.env.HOME!, "writing-system", "corpus");
  let outputDir = join(process.env.HOME!, "writing-system", "vectors");

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--fast") {
      FAST_MODE = true;
    } else if (args[i] === "--corpus" && args[i + 1]) {
      corpusDir = args[i + 1];
      i++;
    } else if (args[i] === "--output" && args[i + 1]) {
      outputDir = args[i + 1];
      i++;
    } else if (!args[i].startsWith("--") && i === 0) {
      corpusDir = args[i];
    } else if (!args[i].startsWith("--") && i === 1) {
      outputDir = args[i];
    }
  }

  console.log("=== Writing Style System: Embed ===\n");
  console.log(`Mode: ${FAST_MODE ? "FAST (summaries only)" : "FULL (all chunks)"}`);

  console.log(`Corpus: ${corpusDir}`);
  console.log(`Output: ${outputDir}`);
  console.log(`Model: ${MODEL_NAME}\n`);

  // Load corpus
  console.log("Loading corpus...");
  const documents = await loadCorpus(corpusDir);
  console.log(`  Loaded ${documents.length} documents`);

  // Chunk documents
  console.log("\nChunking documents...");
  const allChunks: DocumentChunk[] = [];
  for (const doc of documents) {
    const chunks = chunkDocument(doc);
    allChunks.push(...chunks);
  }
  console.log(`  Created ${allChunks.length} chunks`);
  console.log(`  Average ${(allChunks.length / documents.length).toFixed(1)} chunks per document`);

  // Load embedding model
  console.log("\nLoading embedding model (first run downloads ~80MB)...");
  const extractor = await pipeline("feature-extraction", MODEL_NAME);
  console.log("  Model loaded");

  // Generate embeddings in batches
  console.log(`\nGenerating embeddings (batch size: ${BATCH_SIZE})...`);
  const embeddings: EmbeddingRecord[] = [];
  const startTime = Date.now();

  for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
    const batch = allChunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map((c) => c.text);

    // Generate embeddings for batch
    const outputs = await extractor(texts, { pooling: "mean", normalize: true });

    // Extract embedding vectors
    for (let j = 0; j < batch.length; j++) {
      const chunk = batch[j];
      const embedding = Array.from(outputs[j].data as Float32Array);

      embeddings.push({
        docId: chunk.docId,
        chunkIndex: chunk.chunkIndex,
        text: chunk.text.slice(0, 200), // Truncate for storage
        title: chunk.title,
        source: chunk.source,
        embedding,
      });
    }

    const progress = Math.min(100, Math.round(((i + batch.length) / allChunks.length) * 100));
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    process.stdout.write(`\r  Progress: ${progress}% (${i + batch.length}/${allChunks.length}) - ${elapsed}s`);
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n  Completed in ${totalTime}s`);
  console.log(`  Rate: ${(allChunks.length / parseFloat(totalTime)).toFixed(1)} chunks/sec`);

  // Build index
  const index: VectorIndex = {
    version: "1.0",
    model: MODEL_NAME,
    dimensions: EMBEDDING_DIM,
    createdAt: new Date().toISOString(),
    documentCount: documents.length,
    chunkCount: embeddings.length,
    embeddings,
  };

  // Save index
  await mkdir(outputDir, { recursive: true });
  const indexPath = join(outputDir, "embeddings.json");
  await writeFile(indexPath, JSON.stringify(index));

  const fileSizeMB = (JSON.stringify(index).length / 1024 / 1024).toFixed(1);
  console.log(`\n=== Embed Complete ===`);
  console.log(`\nSaved: ${indexPath} (${fileSizeMB}MB)`);
  console.log(`  Documents: ${index.documentCount}`);
  console.log(`  Chunks: ${index.chunkCount}`);
  console.log(`  Dimensions: ${index.dimensions}`);
  console.log(`\nNext: Run Search.ts to query the corpus`);
}

main().catch(console.error);
