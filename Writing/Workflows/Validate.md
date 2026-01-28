# Validate Workflow

> **Trigger:** "validate writing", "check style", "does this match my style"
> **Input:** Content to validate + StyleSpec
> **Output:** ValidationResult (pass/fail + violations)

## Step 1: Load Inputs

```typescript
const content = await readFile(contentPath);
const spec = await loadJSON('~/writing-system/spec/StyleSpec.json');
```

Parse content into sentences and paragraphs for analysis.

## Step 2: Run Validation Checks

### 2.1 Vocabulary Check

```typescript
function checkVocabulary(content: string, spec: StyleSpec): Violation[] {
  const violations: Violation[] = [];
  const words = tokenize(content.toLowerCase());

  // Check banned words
  for (const banned of spec.vocabulary.banned) {
    const matches = findAllOccurrences(content, banned);
    if (matches.length > 0) {
      violations.push({
        rule: 'avoided-words',
        severity: 'major',
        message: `Banned word "${banned}" found`,
        locations: matches.map(m => ({ line: m.line, column: m.column })),
        suggestion: spec.vocabulary.preferred[banned]
          ? `Use "${spec.vocabulary.preferred[banned]}" instead`
          : `Remove or rephrase`
      });
    }
  }

  return violations;
}
```

### 2.2 Sentence Length Check

```typescript
function checkSentenceLength(sentences: string[], spec: StyleSpec): Violation[] {
  const rule = spec.rules.find(r => r.id === 'sentence-length');
  const violations: Violation[] = [];

  sentences.forEach((sentence, idx) => {
    const wordCount = countWords(sentence);
    if (wordCount < rule.validation.min || wordCount > rule.validation.max) {
      violations.push({
        rule: 'sentence-length',
        severity: wordCount > rule.validation.max * 1.5 ? 'major' : 'minor',
        message: `Sentence ${idx + 1} has ${wordCount} words (target: ${rule.validation.min}-${rule.validation.max})`,
        location: { sentenceIndex: idx },
        suggestion: wordCount > rule.validation.max
          ? 'Break into multiple sentences'
          : 'Consider expanding for clarity'
      });
    }
  });

  return violations;
}
```

### 2.3 Active Voice Check

```typescript
function checkActiveVoice(sentences: string[], spec: StyleSpec): Violation[] {
  const rule = spec.rules.find(r => r.id === 'active-voice');
  if (!rule) return [];

  const passiveSentences = sentences.filter(isPassiveVoice);
  const passiveRatio = passiveSentences.length / sentences.length;

  if (passiveRatio > (1 - rule.validation.min)) {
    return [{
      rule: 'active-voice',
      severity: 'major',
      message: `Active voice ratio: ${Math.round((1 - passiveRatio) * 100)}% (target: >${Math.round(rule.validation.min * 100)}%)`,
      details: passiveSentences.slice(0, 5).map((s, i) => ({
        sentence: s,
        suggestion: 'Convert to active voice'
      }))
    }];
  }

  return [];
}
```

### 2.4 Opening Pattern Check

```typescript
function checkOpening(content: string, spec: StyleSpec): Violation[] {
  const firstSentence = extractFirstSentence(content);

  // Check for anti-patterns
  const antiPatterns = [
    /^In this (article|post|piece)/i,
    /^(It is|It's) important to/i,
    /^According to (the )?dictionary/i,
    /^Let me (start|begin) by/i
  ];

  for (const pattern of antiPatterns) {
    if (pattern.test(firstSentence)) {
      return [{
        rule: 'opening-pattern',
        severity: 'major',
        message: 'Opening uses a discouraged pattern',
        location: { line: 1 },
        suggestion: 'Start with a hook: question, bold claim, or specific example'
      }];
    }
  }

  return [];
}
```

## Step 3: Calculate Score

```typescript
interface ValidationResult {
  passed: boolean;
  score: number;  // 0-100
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

function calculateScore(violations: Violation[]): number {
  let score = 100;
  for (const v of violations) {
    score -= v.severity === 'major' ? 10 : 3;
  }
  return Math.max(0, score);
}
```

**Pass threshold:** Score >= 70 with no more than 2 major violations.

## Step 4: Generate Report

```
=== Style Validation Report ===

Result: PASS (Score: 85/100)

Summary:
- Major violations: 1
- Minor violations: 5

Violations:

[MAJOR] Sentence Length (line 15)
  Sentence has 45 words (target: 12-22)
  → Break into multiple sentences

[minor] Avoided word (line 8)
  Found "utilize"
  → Use "use" instead

[minor] Sentence length (line 23)
  Sentence has 8 words (target: 12-22)
  → Consider expanding for clarity

Metrics:
- Average sentence length: 17.3 words ✓
- Active voice ratio: 82% ✓
- Banned words: 1 ✗
```

## Step 5: Suggest Fixes

For each major violation, provide specific rewrite suggestion:

```typescript
async function suggestFix(violation: Violation, context: string): Promise<string> {
  // Use LLM to suggest fix
  const prompt = `
    Original: "${context}"
    Issue: ${violation.message}
    Rule: ${violation.rule}

    Rewrite to fix the issue while preserving meaning:
  `;
  return await llm.complete(prompt);
}
```

## Completion

Report validation results:
- Pass/Fail status
- Score
- Violation list with locations and suggestions
- Option to auto-fix minor issues

## Skills Invoked

| Condition | Skill |
|-----------|-------|
| Fix suggestions | Uses LLM to generate rewrites |
