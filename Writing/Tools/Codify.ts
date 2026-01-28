#!/usr/bin/env bun
/**
 * Writing Style System - Codify Tool
 *
 * Transforms StyleProfile + Exemplars into actionable StyleSpec.
 *
 * Usage:
 *   bun run Codify.ts [analysis-dir] [exemplars-dir] [output-dir]
 *
 * Example:
 *   bun run Codify.ts ~/writing-system/analysis ~/writing-system/exemplars ~/writing-system/spec
 */

import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

interface StyleProfile {
  version: string;
  generatedAt: string;
  corpusStats: {
    documentCount: number;
    totalWords: number;
    totalSentences: number;
  };
  lexical: {
    vocabularySize: number;
    typeTokenRatio: number;
    avgWordLength: number;
    frequentWords: { word: string; count: number; frequency: number }[];
    distinctiveWords: string[];
    avoidedWords: string[];
  };
  syntactic: {
    avgSentenceLength: number;
    sentenceLengthStdDev: number;
    sentenceLengthMin: number;
    sentenceLengthMax: number;
    activeVoiceRatio: number;
    questionRatio: number;
  };
  rhythmic: {
    sentenceLengthDistribution: number[];
    avgParagraphLength: number;
    paragraphLengthVariance: number;
  };
  structural: {
    avgParagraphsPerDoc: number;
    transitionPhrases: { phrase: string; count: number }[];
  };
}

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

interface StyleRule {
  id: string;
  category: "lexical" | "syntactic" | "rhythmic" | "structural" | "rhetorical";
  rule: string;
  validation: {
    type: "range" | "threshold" | "blacklist" | "pattern";
    metric?: string;
    min?: number;
    max?: number;
    words?: string[];
    pattern?: string;
  };
  severity: "major" | "minor";
  examples?: {
    good: string[];
    bad?: string[];
  };
}

interface StyleSpec {
  version: string;
  generatedAt: string;
  corpusStats: {
    documentCount: number;
    totalWords: number;
  };
  rules: StyleRule[];
  vocabulary: {
    preferred: Record<string, string[]>;
    banned: string[];
  };
  exemplarIds: string[];
}

function generateRules(profile: StyleProfile): StyleRule[] {
  const rules: StyleRule[] = [];
  const { syntactic, lexical, rhythmic, structural } = profile;

  // Sentence length rule
  const minLen = Math.max(5, Math.round(syntactic.avgSentenceLength - syntactic.sentenceLengthStdDev * 0.5));
  const maxLen = Math.round(syntactic.avgSentenceLength + syntactic.sentenceLengthStdDev * 0.5);
  rules.push({
    id: "sentence-length",
    category: "syntactic",
    rule: `Target ${minLen}-${maxLen} words per sentence. Your corpus average: ${Math.round(syntactic.avgSentenceLength)} words.`,
    validation: {
      type: "range",
      metric: "avgSentenceLength",
      min: minLen,
      max: maxLen,
    },
    severity: "minor",
  });

  // Active voice rule
  const activeTarget = Math.round(syntactic.activeVoiceRatio * 100);
  rules.push({
    id: "active-voice",
    category: "syntactic",
    rule: `Use active voice in >${activeTarget - 10}% of sentences. Your corpus: ${activeTarget}% active voice.`,
    validation: {
      type: "threshold",
      metric: "activeVoiceRatio",
      min: syntactic.activeVoiceRatio - 0.1,
    },
    severity: "major",
  });

  // Question usage rule
  if (syntactic.questionRatio > 0.02) {
    rules.push({
      id: "question-usage",
      category: "rhetorical",
      rule: `Use rhetorical questions sparingly (~${(syntactic.questionRatio * 100).toFixed(1)}% of sentences).`,
      validation: {
        type: "range",
        metric: "questionRatio",
        min: 0.01,
        max: syntactic.questionRatio + 0.02,
      },
      severity: "minor",
    });
  }

  // Paragraph length rule
  rules.push({
    id: "paragraph-length",
    category: "structural",
    rule: `Keep paragraphs around ${Math.round(rhythmic.avgParagraphLength)} sentences. Vary for rhythm.`,
    validation: {
      type: "range",
      metric: "avgParagraphLength",
      min: Math.max(1, rhythmic.avgParagraphLength - 2),
      max: rhythmic.avgParagraphLength + 2,
    },
    severity: "minor",
  });

  // Transition usage rule
  if (structural.transitionPhrases.length > 0) {
    const topTransitions = structural.transitionPhrases.slice(0, 5).map((t) => t.phrase);
    rules.push({
      id: "transitions",
      category: "structural",
      rule: `Use clear transitions. Preferred: ${topTransitions.join(", ")}.`,
      validation: {
        type: "pattern",
        pattern: topTransitions.join("|"),
      },
      severity: "minor",
    });
  }

  // Opening pattern rule
  rules.push({
    id: "opening-pattern",
    category: "rhetorical",
    rule: "Start with a hook: bold claim, specific example, or direct statement. Never meta-reference ('In this article...').",
    validation: {
      type: "pattern",
      pattern: "^(?!In this (article|post|piece))(?!It is important)(?!Let me)",
    },
    severity: "major",
  });

  // Vocabulary rules
  if (lexical.avoidedWords.length > 0) {
    rules.push({
      id: "avoided-vocabulary",
      category: "lexical",
      rule: `Avoid corporate jargon: ${lexical.avoidedWords.slice(0, 10).join(", ")}.`,
      validation: {
        type: "blacklist",
        words: lexical.avoidedWords,
      },
      severity: "major",
    });
  }

  return rules;
}

function isCleanSentence(s: string): boolean {
  // Filter out YAML frontmatter, metadata, and malformed content
  if (!s || s.length < 20) return false;
  if (s.startsWith("---")) return false;
  if (s.startsWith("title:")) return false;
  if (s.startsWith("author:")) return false;
  if (s.startsWith("date:")) return false;
  if (s.startsWith("tags:")) return false;
  if (s.startsWith("aliases:")) return false;
  if (s.startsWith("sourcetxt:")) return false;
  if (s.startsWith("#")) return false;
  if (s.startsWith(">")) return false; // Blockquotes/social handles
  if (s.startsWith("@")) return false; // Social handles
  if (/^\s*-\s*#/.test(s)) return false; // YAML array items
  if (/^\s*\$/.test(s)) return false; // LaTeX
  if (s.includes("```")) return false; // Code blocks
  if (s.includes(".txt")) return false; // File paths
  if (s.includes(".md")) return false; // File paths
  if (/^[A-Z][a-z]+:/.test(s)) return false; // Generic YAML keys
  if (/\n{2,}/.test(s)) return false; // Multi-line with blank lines
  if (s.split("\n").length > 3) return false; // Too many lines
  // Must start with a letter and look like a real sentence
  if (!/^[A-Z][a-z]/.test(s)) return false;
  // Must have at least one verb-like pattern (basic heuristic)
  if (!/\b(is|are|was|were|have|has|had|do|does|can|will|would|should|could|may|might)\b/i.test(s) &&
      !/\b\w+ed\b/i.test(s) && !/\b\w+ing\b/i.test(s) && !/\b\w+s\b/i.test(s)) {
    return false;
  }
  return true;
}

function extractExamples(
  rules: StyleRule[],
  exemplars: ParsedDocument[]
): StyleRule[] {
  const allSentences = exemplars
    .flatMap((e) => e.parsed.sentences)
    .filter(isCleanSentence);

  for (const rule of rules) {
    const examples: { good: string[]; bad?: string[] } = { good: [] };

    switch (rule.id) {
      case "sentence-length": {
        // Find sentences in the ideal range
        const idealLen = rule.validation.min! + (rule.validation.max! - rule.validation.min!) / 2;
        const goodSentences = allSentences
          .filter((s) => {
            const words = s.split(/\s+/).length;
            return words >= rule.validation.min! && words <= rule.validation.max!;
          })
          .sort((a, b) => {
            const aLen = a.split(/\s+/).length;
            const bLen = b.split(/\s+/).length;
            return Math.abs(aLen - idealLen) - Math.abs(bLen - idealLen);
          })
          .slice(0, 3);
        examples.good = goodSentences;
        break;
      }

      case "active-voice": {
        // Find clear active voice sentences
        const activeSentences = allSentences
          .filter((s) => {
            const hasSubjectVerb = /^[A-Z][^.!?]*\b(is|are|was|were|been|being)\s+\w+ed\b/i.test(s) === false;
            return hasSubjectVerb && s.split(/\s+/).length >= 8 && s.split(/\s+/).length <= 25;
          })
          .slice(0, 3);
        examples.good = activeSentences;

        // Find passive examples
        const passiveSentences = allSentences
          .filter((s) => /\b(was|were|been|being|is|are)\s+\w+ed\b/i.test(s))
          .slice(0, 2);
        if (passiveSentences.length > 0) {
          examples.bad = passiveSentences;
        }
        break;
      }

      case "opening-pattern": {
        // Get first clean sentence from exemplars (skip frontmatter)
        const openings = exemplars
          .map((e) => {
            // Find first actual content sentence, not frontmatter
            for (const s of e.parsed.sentences) {
              if (isCleanSentence(s) && !s.startsWith("In this")) {
                return s;
              }
            }
            return null;
          })
          .filter((s): s is string => s !== null && s.length > 20)
          .slice(0, 3);
        examples.good = openings;
        break;
      }
    }

    if (examples.good.length > 0) {
      rule.examples = examples;
    }
  }

  return rules;
}

function generateVocabularyGuide(profile: StyleProfile): StyleSpec["vocabulary"] {
  // Common replacements based on corpus patterns
  const preferred: Record<string, string[]> = {
    use: ["utilize", "utilise"],
    help: ["assist", "facilitate"],
    show: ["demonstrate", "illustrate", "exhibit"],
    make: ["fabricate", "construct", "manufacture"],
    start: ["commence", "initiate"],
    end: ["terminate", "conclude", "finalize"],
    get: ["obtain", "acquire", "procure"],
    need: ["require", "necessitate"],
    think: ["believe", "opine", "surmise"],
    many: ["numerous", "myriad", "multitudinous"],
  };

  const banned = [
    ...profile.lexical.avoidedWords,
    "synergy",
    "leverage",
    "paradigm",
    "holistic",
    "robust",
    "scalable",
    "ecosystem",
    "disruptive",
    "innovative",
    "cutting-edge",
    "best-in-class",
    "game-changer",
    "low-hanging fruit",
    "move the needle",
    "circle back",
    "deep dive",
    "bandwidth",
    "take offline",
  ];

  return {
    preferred,
    banned: [...new Set(banned)],
  };
}

function generateMarkdownSpec(
  profile: StyleProfile,
  rules: StyleRule[],
  vocabulary: StyleSpec["vocabulary"],
  exemplars: ParsedDocument[]
): string {
  const { corpusStats, syntactic, lexical, rhythmic, structural } = profile;

  return `# Style Specification v1.0

> Generated from corpus of ${corpusStats.documentCount.toLocaleString()} documents (${corpusStats.totalWords.toLocaleString()} words)
> Last updated: ${new Date().toISOString().split("T")[0]}

## Overview

This style guide captures the quantitative patterns and qualitative characteristics from your writing corpus. Use it to maintain consistency across new content.

**Key Metrics:**
- Average sentence length: ${Math.round(syntactic.avgSentenceLength)} words
- Active voice ratio: ${Math.round(syntactic.activeVoiceRatio * 100)}%
- Vocabulary size: ${lexical.vocabularySize.toLocaleString()} unique words
- Question frequency: ${(syntactic.questionRatio * 100).toFixed(1)}%

---

## Voice & Tone

### Active Voice
Use active voice in >${Math.round(syntactic.activeVoiceRatio * 100) - 10}% of sentences.

${rules.find((r) => r.id === "active-voice")?.examples?.good
  ? `**Good:**
${rules.find((r) => r.id === "active-voice")!.examples!.good.map((e) => `> "${e.slice(0, 150)}${e.length > 150 ? "..." : ""}"`).join("\n\n")}`
  : ""}

${rules.find((r) => r.id === "active-voice")?.examples?.bad
  ? `**Avoid:**
${rules.find((r) => r.id === "active-voice")!.examples!.bad!.map((e) => `> "${e.slice(0, 150)}${e.length > 150 ? "..." : ""}"`).join("\n\n")}`
  : ""}

### Directness
Be direct. State claims clearly without hedging.

---

## Vocabulary

### Preferred Words
Use simple words over corporate alternatives:

| Prefer | Avoid |
|--------|-------|
${Object.entries(vocabulary.preferred)
  .slice(0, 10)
  .map(([prefer, avoid]) => `| ${prefer} | ${avoid.join(", ")} |`)
  .join("\n")}

### Banned Words
Never use these corporate buzzwords:
- ${vocabulary.banned.slice(0, 20).join("\n- ")}

---

## Sentence Structure

### Length
- **Target:** ${Math.round(syntactic.avgSentenceLength - syntactic.sentenceLengthStdDev * 0.5)}-${Math.round(syntactic.avgSentenceLength + syntactic.sentenceLengthStdDev * 0.5)} words per sentence
- **Vary for rhythm:** Follow complex sentences with short punchy ones
- **Avoid:** Sentences over ${Math.round(syntactic.avgSentenceLength + syntactic.sentenceLengthStdDev)} words

${rules.find((r) => r.id === "sentence-length")?.examples?.good
  ? `**Examples at ideal length:**
${rules.find((r) => r.id === "sentence-length")!.examples!.good.map((e) => `> "${e.slice(0, 200)}${e.length > 200 ? "..." : ""}"`).join("\n\n")}`
  : ""}

### Sentence Length Distribution
| Range | Target |
|-------|--------|
${rhythmic.sentenceLengthDistribution
  .map((freq, i) => `| ${i * 10 + 1}-${(i + 1) * 10} words | ${(freq * 100).toFixed(0)}% |`)
  .filter((_, i) => i < 5)
  .join("\n")}

---

## Document Structure

### Openings
Start with a hook. Options:
1. **Bold claim:** Make a provocative statement
2. **Specific example:** Ground the reader immediately
3. **Direct question:** Engage curiosity
4. **Relatable observation:** "If you've ever..."

${rules.find((r) => r.id === "opening-pattern")?.examples?.good
  ? `**Examples from your corpus:**
${rules.find((r) => r.id === "opening-pattern")!.examples!.good.map((e) => `> "${e.slice(0, 200)}${e.length > 200 ? "..." : ""}"`).join("\n\n")}`
  : ""}

**Never open with:**
- "In this article, I will..."
- Dictionary definitions
- Throat-clearing ("It's important to understand that...")
- "Let me start by..."

### Paragraphs
- **Target:** ${Math.round(rhythmic.avgParagraphLength)} sentences per paragraph
- **Vary:** Short paragraphs (1-2 sentences) for emphasis
- **Transitions:** Use ${structural.transitionPhrases.slice(0, 5).map((t) => `"${t.phrase}"`).join(", ")}

### Closings
End with:
- A call to action
- A forward-looking statement
- A provocative question
- A memorable summary

---

## Exemplar Documents

These pieces best represent the target style:

${exemplars
  .slice(0, 10)
  .map((e, i) => `${i + 1}. **${e.parsed.title || e.id}** (${e.metadata.wordCount} words)`)
  .join("\n")}

---

## Validation Rules

| Rule ID | Category | Severity | Threshold |
|---------|----------|----------|-----------|
${rules.map((r) => {
  let threshold = "pattern";
  if (r.validation.min !== undefined) {
    // Format percentages nicely
    if (r.id === "active-voice" || r.id === "question-usage") {
      threshold = `>${Math.round(r.validation.min * 100)}%`;
    } else {
      threshold = `>${Math.round(r.validation.min)}`;
    }
  } else if (r.validation.max !== undefined) {
    threshold = `<${Math.round(r.validation.max)}`;
  }
  return `| ${r.id} | ${r.category} | ${r.severity} | ${threshold} |`;
}).join("\n")}

---

*Generated by Writing Style System*
`;
}

async function main() {
  const args = process.argv.slice(2);
  const analysisDir = args[0] || join(process.env.HOME!, "writing-system", "analysis");
  const exemplarsDir = args[1] || join(process.env.HOME!, "writing-system", "exemplars");
  const outputDir = args[2] || join(process.env.HOME!, "writing-system", "spec");

  console.log("=== Writing Style System: Codify ===\n");
  console.log(`Analysis: ${analysisDir}`);
  console.log(`Exemplars: ${exemplarsDir}`);
  console.log(`Output: ${outputDir}\n`);

  // Load StyleProfile
  console.log("Loading style profile...");
  const profileContent = await readFile(join(analysisDir, "StyleProfile.json"), "utf-8");
  const profile: StyleProfile = JSON.parse(profileContent);
  console.log(`  Corpus: ${profile.corpusStats.documentCount} docs, ${profile.corpusStats.totalWords.toLocaleString()} words`);

  // Load exemplars
  console.log("\nLoading exemplars...");
  const exemplarFiles = await readdir(exemplarsDir);
  const exemplars: ParsedDocument[] = [];

  for (const file of exemplarFiles) {
    if (file.endsWith(".json")) {
      const content = await readFile(join(exemplarsDir, file), "utf-8");
      exemplars.push(JSON.parse(content));
    }
  }
  console.log(`  Found ${exemplars.length} exemplar documents`);

  if (exemplars.length < 5) {
    console.error("\nError: Need at least 5 exemplar documents.");
    console.error("Add more documents to ~/writing-system/exemplars/");
    process.exit(1);
  }

  // Generate rules
  console.log("\nGenerating rules from metrics...");
  let rules = generateRules(profile);
  console.log(`  Created ${rules.length} rules`);

  // Extract examples
  console.log("\nExtracting examples from exemplars...");
  rules = extractExamples(rules, exemplars);
  const rulesWithExamples = rules.filter((r) => r.examples?.good?.length);
  console.log(`  Found examples for ${rulesWithExamples.length} rules`);

  // Generate vocabulary guide
  console.log("\nGenerating vocabulary guide...");
  const vocabulary = generateVocabularyGuide(profile);
  console.log(`  ${Object.keys(vocabulary.preferred).length} preferred terms`);
  console.log(`  ${vocabulary.banned.length} banned terms`);

  // Build spec
  const spec: StyleSpec = {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    corpusStats: {
      documentCount: profile.corpusStats.documentCount,
      totalWords: profile.corpusStats.totalWords,
    },
    rules,
    vocabulary,
    exemplarIds: exemplars.map((e) => e.id),
  };

  // Save outputs
  await mkdir(outputDir, { recursive: true });

  // JSON spec
  await writeFile(join(outputDir, "StyleSpec.json"), JSON.stringify(spec, null, 2));
  console.log(`\nSaved: ${join(outputDir, "StyleSpec.json")}`);

  // Markdown spec
  const markdown = generateMarkdownSpec(profile, rules, vocabulary, exemplars);
  await writeFile(join(outputDir, "StyleSpec.md"), markdown);
  console.log(`Saved: ${join(outputDir, "StyleSpec.md")}`);

  console.log("\n=== Codify Complete ===");
  console.log("\nNext steps:");
  console.log("  1. Review StyleSpec.md and adjust rules if needed");
  console.log("  2. Run: bun run Validate.ts <draft.md> to test on content");
  console.log("  3. Use Apply workflow to generate styled content");
}

main().catch(console.error);
