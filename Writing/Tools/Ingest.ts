#!/usr/bin/env bun
/**
 * Writing Style System - Ingest Tool
 *
 * Converts raw documents (docx, txt, md) to structured JSON corpus.
 *
 * Usage:
 *   bun run Ingest.ts <source-dir> [output-dir]
 *
 * Example:
 *   bun run Ingest.ts ~/obsidian/writing ~/writing-system/corpus
 */

import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import { join, extname, basename } from "path";
import { execSync } from "child_process";
import { createHash } from "crypto";

interface ParsedDocument {
  id: string;
  source: string;
  content: string;
  metadata: {
    wordCount: number;
    characterCount: number;
    paragraphCount: number;
    sentenceCount: number;
    estimatedReadingTime: number;
  };
  parsed: {
    title: string | null;
    sentences: string[];
    paragraphs: string[];
    headings: { level: number; text: string }[];
  };
}

interface CorpusIndex {
  totalDocuments: number;
  totalWords: number;
  avgWordsPerDoc: number;
  ingestedAt: string;
  documents: { id: string; source: string; wordCount: number }[];
}

// Sentence splitting (basic implementation)
function splitSentences(text: string): string[] {
  // Don't split on common abbreviations
  const abbrevs = ["Mr.", "Mrs.", "Ms.", "Dr.", "Prof.", "Inc.", "Ltd.", "etc.", "e.g.", "i.e."];
  let processed = text;

  // Temporarily replace abbreviations
  abbrevs.forEach((abbr, i) => {
    processed = processed.replace(new RegExp(abbr.replace(".", "\\."), "g"), `__ABBR${i}__`);
  });

  // Split on sentence boundaries
  const sentences = processed
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => {
      // Restore abbreviations
      abbrevs.forEach((abbr, i) => {
        s = s.replace(new RegExp(`__ABBR${i}__`, "g"), abbr);
      });
      return s.trim();
    })
    .filter((s) => s.length > 0);

  return sentences;
}

// Extract headings from markdown
function extractHeadings(content: string): { level: number; text: string }[] {
  const headings: { level: number; text: string }[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
      });
    }
  }

  return headings;
}

// Parse a single document
function parseDocument(source: string, content: string): ParsedDocument {
  const id = createHash("sha256").update(content).digest("hex").slice(0, 12);

  // Clean content (remove markdown formatting for analysis)
  const cleanContent = content
    .replace(/^#{1,6}\s+/gm, "") // Remove heading markers
    .replace(/\*\*|__/g, "") // Remove bold
    .replace(/\*|_/g, "") // Remove italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove links, keep text
    .replace(/```[\s\S]*?```/g, "") // Remove code blocks
    .replace(/`[^`]+`/g, ""); // Remove inline code

  const paragraphs = cleanContent
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const sentences = splitSentences(cleanContent);
  const words = cleanContent.split(/\s+/).filter((w) => w.length > 0);
  const headings = extractHeadings(content);

  // Extract title (first H1 or filename)
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : basename(source, extname(source));

  return {
    id,
    source,
    content,
    metadata: {
      wordCount: words.length,
      characterCount: content.length,
      paragraphCount: paragraphs.length,
      sentenceCount: sentences.length,
      estimatedReadingTime: Math.ceil(words.length / 200), // 200 WPM
    },
    parsed: {
      title,
      sentences,
      paragraphs,
      headings,
    },
  };
}

// Convert docx to markdown using pandoc
async function convertDocx(filePath: string): Promise<string> {
  try {
    const result = execSync(`pandoc "${filePath}" -t markdown`, {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    });
    return result;
  } catch (error) {
    console.error(`Failed to convert ${filePath}:`, error);
    return "";
  }
}

// Recursively find all documents
async function findDocuments(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findDocuments(fullPath)));
    } else if ([".md", ".txt", ".docx", ".doc"].includes(extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log("Usage: bun run Ingest.ts <source-dir> [output-dir]");
    console.log("\nExample:");
    console.log("  bun run Ingest.ts ~/obsidian/writing ~/writing-system/corpus");
    process.exit(1);
  }

  const sourceDir = args[0];
  const outputDir = args[1] || join(process.env.HOME!, "writing-system", "corpus");

  console.log("=== Writing Style System: Ingest ===\n");
  console.log(`Source: ${sourceDir}`);
  console.log(`Output: ${outputDir}\n`);

  // Create output directories
  await mkdir(join(outputDir, "raw"), { recursive: true });
  await mkdir(join(outputDir, "structured"), { recursive: true });

  // Find all documents
  console.log("Scanning for documents...");
  const files = await findDocuments(sourceDir);
  console.log(`Found ${files.length} documents\n`);

  const documents: ParsedDocument[] = [];
  const warnings: string[] = [];
  let totalWords = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = extname(file).toLowerCase();

    process.stdout.write(`\rProcessing ${i + 1}/${files.length}: ${basename(file).slice(0, 40)}...`);

    let content: string;

    if (ext === ".docx" || ext === ".doc") {
      content = await convertDocx(file);
    } else {
      content = await readFile(file, "utf-8");
    }

    if (!content || content.trim().length === 0) {
      warnings.push(`Empty or failed: ${file}`);
      continue;
    }

    const doc = parseDocument(file, content);

    // Quality checks
    if (doc.metadata.wordCount < 100) {
      warnings.push(`Too short (${doc.metadata.wordCount} words): ${file}`);
    }
    if (doc.metadata.wordCount > 10000) {
      warnings.push(`Very long (${doc.metadata.wordCount} words): ${file}`);
    }
    if (doc.parsed.sentences.length === 0) {
      warnings.push(`No sentences parsed: ${file}`);
    }

    documents.push(doc);
    totalWords += doc.metadata.wordCount;

    // Save structured document
    await writeFile(
      join(outputDir, "structured", `${doc.id}.json`),
      JSON.stringify(doc, null, 2)
    );

    // Save raw markdown
    await writeFile(join(outputDir, "raw", `${doc.id}.md`), content);
  }

  console.log("\n");

  // Generate index
  const index: CorpusIndex = {
    totalDocuments: documents.length,
    totalWords,
    avgWordsPerDoc: Math.round(totalWords / documents.length),
    ingestedAt: new Date().toISOString(),
    documents: documents.map((d) => ({
      id: d.id,
      source: d.source,
      wordCount: d.metadata.wordCount,
    })),
  };

  await writeFile(join(outputDir, "index.json"), JSON.stringify(index, null, 2));

  // Report
  console.log("=== Ingest Complete ===\n");
  console.log(`Ingested: ${documents.length} documents`);
  console.log(`Total words: ${totalWords.toLocaleString()}`);
  console.log(`Average: ${index.avgWordsPerDoc} words/doc`);

  if (warnings.length > 0) {
    console.log(`\nWarnings: ${warnings.length}`);
    warnings.slice(0, 10).forEach((w) => console.log(`  - ${w}`));
    if (warnings.length > 10) {
      console.log(`  ... and ${warnings.length - 10} more`);
    }
  }

  console.log(`\nCorpus ready at: ${outputDir}`);
  console.log("\nNext: Run Analyze.ts to extract style metrics");
}

main().catch(console.error);
