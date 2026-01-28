#!/usr/bin/env bun
/**
 * Writing Style System - Validate Tool
 *
 * Checks content against style specification.
 *
 * Usage:
 *   bun run Validate.ts <content-file> [--spec <spec-file>]
 *
 * Example:
 *   bun run Validate.ts draft.md --spec ~/writing-system/spec/StyleSpec.json
 */

import { readFile } from "fs/promises";
import { join } from "path";

interface StyleRule {
  id: string;
  category: string;
  rule: string;
  validation: {
    type: "range" | "threshold" | "blacklist";
    metric?: string;
    min?: number;
    max?: number;
    words?: string[];
  };
  severity: "major" | "minor";
}

interface StyleSpec {
  version: string;
  rules: StyleRule[];
  vocabulary: {
    preferred: Record<string, string[]>;
    banned: string[];
  };
}

interface Violation {
  rule: string;
  severity: "major" | "minor";
  message: string;
  line?: number;
  suggestion?: string;
}

interface ValidationResult {
  passed: boolean;
  score: number;
  summary: {
    totalChecks: number;
    majorViolations: number;
    minorViolations: number;
  };
  violations: Violation[];
  metrics: {
    avgSentenceLength: number;
    activeVoiceRatio: number;
    bannedWordsFound: number;
  };
}

function splitSentences(text: string): string[] {
  const abbrevs = ["Mr.", "Mrs.", "Ms.", "Dr.", "Prof.", "Inc.", "Ltd.", "etc.", "e.g.", "i.e."];
  let processed = text;

  abbrevs.forEach((abbr, i) => {
    processed = processed.replace(new RegExp(abbr.replace(".", "\\."), "g"), `__ABBR${i}__`);
  });

  const sentences = processed
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => {
      abbrevs.forEach((abbr, i) => {
        s = s.replace(new RegExp(`__ABBR${i}__`, "g"), abbr);
      });
      return s.trim();
    })
    .filter((s) => s.length > 0);

  return sentences;
}

function countWords(sentence: string): number {
  return sentence.split(/\s+/).filter((w) => w.length > 0).length;
}

function isPassiveVoice(sentence: string): boolean {
  const passivePatterns = [
    /\b(was|were|been|being|is|are)\s+\w+ed\b/i,
    /\b(was|were|been|being|is|are)\s+\w+en\b/i,
  ];
  return passivePatterns.some((p) => p.test(sentence));
}

function findWordOccurrences(
  content: string,
  word: string
): { line: number; column: number }[] {
  const occurrences: { line: number; column: number }[] = [];
  const lines = content.split("\n");
  const regex = new RegExp(`\\b${word}\\b`, "gi");

  lines.forEach((line, lineNum) => {
    let match;
    while ((match = regex.exec(line)) !== null) {
      occurrences.push({ line: lineNum + 1, column: match.index + 1 });
    }
  });

  return occurrences;
}

function checkVocabulary(content: string, spec: StyleSpec): Violation[] {
  const violations: Violation[] = [];

  for (const banned of spec.vocabulary.banned) {
    const occurrences = findWordOccurrences(content, banned);
    if (occurrences.length > 0) {
      const preferred = Object.entries(spec.vocabulary.preferred).find(
        ([, avoided]) => avoided.includes(banned)
      );

      violations.push({
        rule: "avoided-words",
        severity: "major",
        message: `Banned word "${banned}" found (${occurrences.length}x)`,
        line: occurrences[0].line,
        suggestion: preferred ? `Use "${preferred[0]}" instead` : "Remove or rephrase",
      });
    }
  }

  return violations;
}

function checkSentenceLength(sentences: string[], spec: StyleSpec): Violation[] {
  const violations: Violation[] = [];
  const rule = spec.rules.find((r) => r.id === "sentence-length");

  if (!rule || rule.validation.type !== "range") return violations;

  const { min = 5, max = 30 } = rule.validation;

  sentences.forEach((sentence, idx) => {
    const wordCount = countWords(sentence);
    if (wordCount < min || wordCount > max) {
      violations.push({
        rule: "sentence-length",
        severity: wordCount > max * 1.5 || wordCount < min * 0.5 ? "major" : "minor",
        message: `Sentence ${idx + 1} has ${wordCount} words (target: ${min}-${max})`,
        suggestion:
          wordCount > max
            ? "Break into multiple sentences"
            : "Consider expanding for clarity",
      });
    }
  });

  return violations;
}

function checkActiveVoice(sentences: string[], spec: StyleSpec): Violation[] {
  const violations: Violation[] = [];
  const rule = spec.rules.find((r) => r.id === "active-voice");

  if (!rule || rule.validation.type !== "threshold") return violations;

  const passiveSentences = sentences.filter(isPassiveVoice);
  const activeRatio = 1 - passiveSentences.length / sentences.length;

  if (activeRatio < (rule.validation.min || 0.7)) {
    violations.push({
      rule: "active-voice",
      severity: "major",
      message: `Active voice ratio: ${(activeRatio * 100).toFixed(0)}% (target: >${((rule.validation.min || 0.7) * 100).toFixed(0)}%)`,
      suggestion: "Convert passive constructions to active voice",
    });
  }

  return violations;
}

function checkOpeningPattern(content: string): Violation[] {
  const violations: Violation[] = [];
  const firstSentence = content.split(/[.!?]/)[0] || "";

  const antiPatterns = [
    { pattern: /^In this (article|post|piece)/i, name: "meta-reference" },
    { pattern: /^(It is|It's) important to/i, name: "throat-clearing" },
    { pattern: /^According to (the )?dictionary/i, name: "dictionary-definition" },
    { pattern: /^Let me (start|begin) by/i, name: "unnecessary-preamble" },
  ];

  for (const { pattern, name } of antiPatterns) {
    if (pattern.test(firstSentence)) {
      violations.push({
        rule: "opening-pattern",
        severity: "major",
        message: `Opening uses discouraged pattern: ${name}`,
        line: 1,
        suggestion: "Start with a hook: question, bold claim, or specific example",
      });
      break;
    }
  }

  return violations;
}

function calculateScore(violations: Violation[]): number {
  let score = 100;
  for (const v of violations) {
    score -= v.severity === "major" ? 10 : 3;
  }
  return Math.max(0, score);
}

async function validate(content: string, spec: StyleSpec): Promise<ValidationResult> {
  const sentences = splitSentences(content);
  const allViolations: Violation[] = [];

  // Run all checks
  allViolations.push(...checkVocabulary(content, spec));
  allViolations.push(...checkSentenceLength(sentences, spec));
  allViolations.push(...checkActiveVoice(sentences, spec));
  allViolations.push(...checkOpeningPattern(content));

  // Calculate metrics
  const sentenceLengths = sentences.map(countWords);
  const avgSentenceLength =
    sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
  const passiveCount = sentences.filter(isPassiveVoice).length;
  const activeVoiceRatio = 1 - passiveCount / sentences.length;
  const bannedWordsFound = allViolations.filter((v) => v.rule === "avoided-words").length;

  const score = calculateScore(allViolations);
  const majorViolations = allViolations.filter((v) => v.severity === "major").length;
  const minorViolations = allViolations.filter((v) => v.severity === "minor").length;

  return {
    passed: score >= 70 && majorViolations <= 2,
    score,
    summary: {
      totalChecks: 4,
      majorViolations,
      minorViolations,
    },
    violations: allViolations,
    metrics: {
      avgSentenceLength,
      activeVoiceRatio,
      bannedWordsFound,
    },
  };
}

function formatReport(result: ValidationResult): string {
  const status = result.passed ? "PASS" : "FAIL";
  const statusColor = result.passed ? "\x1b[32m" : "\x1b[31m";
  const reset = "\x1b[0m";

  let report = `
=== Style Validation Report ===

Result: ${statusColor}${status}${reset} (Score: ${result.score}/100)

Summary:
- Major violations: ${result.summary.majorViolations}
- Minor violations: ${result.summary.minorViolations}
`;

  if (result.violations.length > 0) {
    report += "\nViolations:\n";
    for (const v of result.violations) {
      const severityTag = v.severity === "major" ? "[MAJOR]" : "[minor]";
      report += `\n${severityTag} ${v.rule}${v.line ? ` (line ${v.line})` : ""}\n`;
      report += `  ${v.message}\n`;
      if (v.suggestion) {
        report += `  → ${v.suggestion}\n`;
      }
    }
  }

  report += `
Metrics:
- Average sentence length: ${result.metrics.avgSentenceLength.toFixed(1)} words
- Active voice ratio: ${(result.metrics.activeVoiceRatio * 100).toFixed(0)}%
- Banned words found: ${result.metrics.bannedWordsFound}
`;

  return report;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log("Usage: bun run Validate.ts <content-file> [--spec <spec-file>]");
    console.log("\nExample:");
    console.log("  bun run Validate.ts draft.md --spec ~/writing-system/spec/StyleSpec.json");
    process.exit(1);
  }

  const contentFile = args[0];
  const specIndex = args.indexOf("--spec");
  const specFile =
    specIndex !== -1 && args[specIndex + 1]
      ? args[specIndex + 1]
      : join(process.env.HOME!, "writing-system", "spec", "StyleSpec.json");

  // Load content
  const content = await readFile(contentFile, "utf-8");

  // Load or create default spec
  let spec: StyleSpec;
  try {
    const specContent = await readFile(specFile, "utf-8");
    spec = JSON.parse(specContent);
  } catch {
    // Default spec if none exists
    spec = {
      version: "1.0",
      rules: [
        {
          id: "sentence-length",
          category: "syntactic",
          rule: "Keep sentences between 10 and 25 words",
          validation: { type: "range", min: 10, max: 25 },
          severity: "minor",
        },
        {
          id: "active-voice",
          category: "syntactic",
          rule: "Use active voice >70%",
          validation: { type: "threshold", min: 0.7 },
          severity: "major",
        },
      ],
      vocabulary: {
        preferred: {
          use: ["utilize", "utilise"],
          help: ["assist", "aid"],
          show: ["demonstrate", "illustrate"],
          make: ["fabricate", "construct"],
        },
        banned: [
          "utilize",
          "synergy",
          "leverage",
          "paradigm",
          "holistic",
          "robust",
          "scalable",
        ],
      },
    };
    console.log("Note: Using default style spec (no spec file found)\n");
  }

  const result = await validate(content, spec);
  console.log(formatReport(result));

  // Exit with appropriate code
  process.exit(result.passed ? 0 : 1);
}

main().catch(console.error);
