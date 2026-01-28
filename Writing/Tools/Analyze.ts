#!/usr/bin/env bun
/**
 * Writing Style System - Analyze Tool
 *
 * Extracts quantitative style metrics from structured corpus.
 *
 * Usage:
 *   bun run Analyze.ts [corpus-dir]
 *
 * Example:
 *   bun run Analyze.ts ~/writing-system/corpus
 */

import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

interface ParsedDocument {
  id: string;
  source: string;
  content: string;
  metadata: {
    wordCount: number;
    sentenceCount: number;
  };
  parsed: {
    sentences: string[];
    paragraphs: string[];
  };
}

interface LexicalProfile {
  vocabularySize: number;
  typeTokenRatio: number;
  avgWordLength: number;
  frequentWords: { word: string; count: number; frequency: number }[];
  distinctiveWords: string[];
  avoidedWords: string[];
}

interface SyntacticProfile {
  avgSentenceLength: number;
  sentenceLengthStdDev: number;
  sentenceLengthMin: number;
  sentenceLengthMax: number;
  activeVoiceRatio: number;
  questionRatio: number;
}

interface RhythmicProfile {
  sentenceLengthDistribution: number[];
  avgParagraphLength: number;
  paragraphLengthVariance: number;
}

interface StructuralProfile {
  avgParagraphsPerDoc: number;
  transitionPhrases: { phrase: string; count: number }[];
}

interface StyleProfile {
  version: string;
  generatedAt: string;
  corpusStats: {
    documentCount: number;
    totalWords: number;
    totalSentences: number;
  };
  lexical: LexicalProfile;
  syntactic: SyntacticProfile;
  rhythmic: RhythmicProfile;
  structural: StructuralProfile;
}

// Common English words (stopwords)
const STOPWORDS = new Set([
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "i",
  "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
  "this", "but", "his", "by", "from", "they", "we", "say", "her", "she",
  "or", "an", "will", "my", "one", "all", "would", "there", "their", "what",
  "so", "up", "out", "if", "about", "who", "get", "which", "go", "me",
  "is", "are", "was", "were", "been", "being", "has", "had", "having",
  "does", "did", "doing", "can", "could", "should", "would", "may", "might",
  "must", "shall", "will", "just", "also", "very", "much", "more", "most",
  "no", "yes", "any", "some", "than", "then", "now", "only", "other"
]);

// Common transition phrases
const TRANSITION_PATTERNS = [
  "however", "therefore", "moreover", "furthermore", "in addition",
  "on the other hand", "in contrast", "for example", "for instance",
  "in fact", "as a result", "consequently", "meanwhile", "nevertheless",
  "in other words", "to put it simply", "that said", "in short",
  "first", "second", "third", "finally", "next", "then"
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

function countWords(sentence: string): number {
  return sentence.split(/\s+/).filter((w) => w.length > 0).length;
}

function isPassiveVoice(sentence: string): boolean {
  // Simple heuristic: was/were/been + past participle pattern
  const passivePatterns = [
    /\b(was|were|been|being|is|are)\s+\w+ed\b/i,
    /\b(was|were|been|being|is|are)\s+\w+en\b/i,
    /\bby\s+(the|a|an)\s+\w+/i,
  ];
  return passivePatterns.some((p) => p.test(sentence));
}

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr: number[]): number {
  const avg = mean(arr);
  const squareDiffs = arr.map((v) => Math.pow(v - avg, 2));
  return Math.sqrt(mean(squareDiffs));
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

function analyzeLexical(documents: ParsedDocument[]): LexicalProfile {
  const allText = documents.map((d) => d.content).join(" ");
  const words = tokenize(allText);
  const wordFreq = new Map<string, number>();

  for (const word of words) {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
  }

  // Filter out stopwords for frequency analysis
  const contentWords = Array.from(wordFreq.entries())
    .filter(([word]) => !STOPWORDS.has(word) && word.length > 2)
    .sort((a, b) => b[1] - a[1]);

  const totalWords = words.length;
  const frequentWords = contentWords.slice(0, 100).map(([word, count]) => ({
    word,
    count,
    frequency: count / totalWords,
  }));

  // Find distinctive words (appear more than expected)
  // Using simple threshold: appears in >1% of words but not in top 1000 English
  const distinctiveWords = contentWords
    .filter(([, count]) => count / totalWords > 0.001)
    .slice(0, 50)
    .map(([word]) => word);

  // Find commonly avoided words
  const commonEnglishWords = [
    "very", "really", "actually", "basically", "literally",
    "utilize", "leverage", "synergy", "paradigm", "holistic",
    "robust", "scalable", "ecosystem", "disrupt", "innovative"
  ];
  const avoidedWords = commonEnglishWords.filter(
    (w) => !wordFreq.has(w) || wordFreq.get(w)! < 3
  );

  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;

  return {
    vocabularySize: wordFreq.size,
    typeTokenRatio: wordFreq.size / totalWords,
    avgWordLength,
    frequentWords,
    distinctiveWords,
    avoidedWords,
  };
}

function analyzeSyntactic(documents: ParsedDocument[]): SyntacticProfile {
  const allSentences = documents.flatMap((d) => d.parsed.sentences);
  const sentenceLengths = allSentences.map(countWords);

  const passiveSentences = allSentences.filter(isPassiveVoice);
  const questions = allSentences.filter((s) => s.trim().endsWith("?"));

  return {
    avgSentenceLength: mean(sentenceLengths),
    sentenceLengthStdDev: stdDev(sentenceLengths),
    sentenceLengthMin: Math.min(...sentenceLengths),
    sentenceLengthMax: Math.max(...sentenceLengths),
    activeVoiceRatio: 1 - passiveSentences.length / allSentences.length,
    questionRatio: questions.length / allSentences.length,
  };
}

function analyzeRhythmic(documents: ParsedDocument[]): RhythmicProfile {
  const allSentences = documents.flatMap((d) => d.parsed.sentences);
  const sentenceLengths = allSentences.map(countWords);

  // Create distribution buckets (0-10, 11-20, 21-30, etc.)
  const distribution = new Array(10).fill(0);
  for (const len of sentenceLengths) {
    const bucket = Math.min(Math.floor(len / 10), 9);
    distribution[bucket]++;
  }

  const paragraphLengths = documents.flatMap((d) =>
    d.parsed.paragraphs.map((p) => p.split(/[.!?]/).length)
  );

  return {
    sentenceLengthDistribution: distribution.map((c) => c / sentenceLengths.length),
    avgParagraphLength: mean(paragraphLengths),
    paragraphLengthVariance: stdDev(paragraphLengths),
  };
}

function analyzeStructural(documents: ParsedDocument[]): StructuralProfile {
  const allText = documents.map((d) => d.content.toLowerCase()).join(" ");

  const transitionCounts = TRANSITION_PATTERNS.map((phrase) => {
    const regex = new RegExp(`\\b${phrase}\\b`, "gi");
    const matches = allText.match(regex);
    return { phrase, count: matches?.length || 0 };
  }).filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count);

  const avgParagraphs = mean(documents.map((d) => d.parsed.paragraphs.length));

  return {
    avgParagraphsPerDoc: avgParagraphs,
    transitionPhrases: transitionCounts.slice(0, 20),
  };
}

function generateReport(profile: StyleProfile): string {
  const { corpusStats, lexical, syntactic, rhythmic, structural } = profile;

  return `# Style Analysis Report

Generated: ${profile.generatedAt}

## Corpus Summary

- Documents: ${corpusStats.documentCount.toLocaleString()}
- Total words: ${corpusStats.totalWords.toLocaleString()}
- Total sentences: ${corpusStats.totalSentences.toLocaleString()}

## Key Characteristics

1. **Sentence length**: Average ${syntactic.avgSentenceLength.toFixed(1)} words (σ=${syntactic.sentenceLengthStdDev.toFixed(1)})
2. **Active voice**: ${(syntactic.activeVoiceRatio * 100).toFixed(0)}%
3. **Question usage**: ${(syntactic.questionRatio * 100).toFixed(1)}%
4. **Vocabulary size**: ${lexical.vocabularySize.toLocaleString()} unique words

## Lexical Profile

### Most Frequent Words (excluding stopwords)
${lexical.frequentWords.slice(0, 20).map((w, i) => `${i + 1}. ${w.word} (${w.count})`).join("\n")}

### Distinctive Words
Words used more than typical:
${lexical.distinctiveWords.slice(0, 20).join(", ")}

### Avoided Words
Common words rarely/never used:
${lexical.avoidedWords.join(", ")}

## Syntactic Profile

| Metric | Value |
|--------|-------|
| Avg sentence length | ${syntactic.avgSentenceLength.toFixed(1)} words |
| Std deviation | ${syntactic.sentenceLengthStdDev.toFixed(1)} |
| Range | ${syntactic.sentenceLengthMin}-${syntactic.sentenceLengthMax} words |
| Active voice ratio | ${(syntactic.activeVoiceRatio * 100).toFixed(0)}% |
| Question frequency | ${(syntactic.questionRatio * 100).toFixed(1)}% |

## Rhythmic Profile

### Sentence Length Distribution
| Range | Frequency |
|-------|-----------|
${rhythmic.sentenceLengthDistribution.map((freq, i) => `| ${i * 10 + 1}-${(i + 1) * 10} words | ${(freq * 100).toFixed(1)}% |`).join("\n")}

### Paragraph Metrics
- Average sentences per paragraph: ${rhythmic.avgParagraphLength.toFixed(1)}
- Paragraph length variance: ${rhythmic.paragraphLengthVariance.toFixed(1)}

## Structural Profile

### Transition Phrases Used
${structural.transitionPhrases.slice(0, 10).map((t) => `- "${t.phrase}" (${t.count}x)`).join("\n")}

---

*Generated by Writing Style System*
`;
}

async function main() {
  const args = process.argv.slice(2);
  const corpusDir = args[0] || join(process.env.HOME!, "writing-system", "corpus");
  const outputDir = args[1] || join(process.env.HOME!, "writing-system", "analysis");

  console.log("=== Writing Style System: Analyze ===\n");
  console.log(`Corpus: ${corpusDir}`);
  console.log(`Output: ${outputDir}\n`);

  // Load corpus
  console.log("Loading corpus...");
  const documents = await loadCorpus(corpusDir);
  console.log(`Loaded ${documents.length} documents\n`);

  if (documents.length === 0) {
    console.error("No documents found. Run Ingest.ts first.");
    process.exit(1);
  }

  // Analyze
  console.log("Analyzing lexical patterns...");
  const lexical = analyzeLexical(documents);

  console.log("Analyzing syntactic patterns...");
  const syntactic = analyzeSyntactic(documents);

  console.log("Analyzing rhythmic patterns...");
  const rhythmic = analyzeRhythmic(documents);

  console.log("Analyzing structural patterns...");
  const structural = analyzeStructural(documents);

  // Build profile
  const profile: StyleProfile = {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    corpusStats: {
      documentCount: documents.length,
      totalWords: documents.reduce((sum, d) => sum + d.metadata.wordCount, 0),
      totalSentences: documents.reduce((sum, d) => sum + d.metadata.sentenceCount, 0),
    },
    lexical,
    syntactic,
    rhythmic,
    structural,
  };

  // Save outputs
  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, "StyleProfile.json"), JSON.stringify(profile, null, 2));

  const report = generateReport(profile);
  await writeFile(join(outputDir, "StyleReport.md"), report);

  console.log("\n=== Analysis Complete ===\n");
  console.log(`Style profile: ${join(outputDir, "StyleProfile.json")}`);
  console.log(`Human report:  ${join(outputDir, "StyleReport.md")}`);
  console.log("\nNext: Run Codify workflow to generate style spec");
}

main().catch(console.error);
