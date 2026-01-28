# Codify Workflow

> **Trigger:** "create style spec", "codify style", "generate guidelines"
> **Input:** StyleProfile + Exemplar documents
> **Output:** StyleSpec (human-readable .md + machine-readable .json)

## Step 1: Load Inputs

Required:
- `~/writing-system/analysis/StyleProfile.json`
- `~/writing-system/exemplars/` (at least 5 annotated examples)

If exemplars missing:
```
Error: Need at least 5 exemplar documents.
Tag your best pieces with quality annotations in ~/writing-system/exemplars/
```

## Step 2: Generate Rules from Metrics

Transform quantitative metrics into actionable rules:

```typescript
function metricsToRules(profile: StyleProfile): Rule[] {
  const rules: Rule[] = [];

  // Sentence length rule
  const { avgSentenceLength, sentenceLengthStdDev } = profile.syntactic;
  rules.push({
    id: 'sentence-length',
    category: 'syntactic',
    rule: `Keep sentences between ${Math.round(avgSentenceLength - sentenceLengthStdDev)} and ${Math.round(avgSentenceLength + sentenceLengthStdDev)} words. Average: ${Math.round(avgSentenceLength)}.`,
    validation: {
      type: 'range',
      metric: 'avgSentenceLength',
      min: avgSentenceLength - sentenceLengthStdDev,
      max: avgSentenceLength + sentenceLengthStdDev
    }
  });

  // Active voice rule
  if (profile.syntactic.activeVoiceRatio > 0.7) {
    rules.push({
      id: 'active-voice',
      category: 'syntactic',
      rule: `Use active voice. Target: >${Math.round(profile.syntactic.activeVoiceRatio * 100)}%`,
      validation: {
        type: 'threshold',
        metric: 'activeVoiceRatio',
        min: profile.syntactic.activeVoiceRatio - 0.1
      }
    });
  }

  // Vocabulary rules
  if (profile.lexical.avoidedWords.length > 0) {
    rules.push({
      id: 'avoided-words',
      category: 'lexical',
      rule: `Avoid: ${profile.lexical.avoidedWords.slice(0, 20).join(', ')}`,
      validation: {
        type: 'blacklist',
        words: profile.lexical.avoidedWords
      }
    });
  }

  // ... more rule generation
  return rules;
}
```

## Step 3: Extract Examples from Exemplars

For each rule, find illustrating examples from exemplars:

```typescript
interface RuleWithExamples extends Rule {
  examples: {
    good: string[];   // Sentences that follow the rule
    bad?: string[];   // Counter-examples (if available)
  };
}
```

Use LLM to find best examples:
```
Given this rule: "${rule.rule}"

Find 2-3 sentences from these exemplars that best demonstrate this rule:
${exemplarContent}
```

## Step 4: Generate Human-Readable Spec

Output: `~/writing-system/spec/StyleSpec.md`

```markdown
# Style Specification v1.0

> Generated from corpus of ${corpusStats.documentCount} documents
> Last updated: ${timestamp}

## Voice & Tone

### Active Voice
Use active voice in >75% of sentences.

**Good:** "The team shipped the feature on Tuesday."
**Avoid:** "The feature was shipped by the team on Tuesday."

## Vocabulary

### Preferred Words
Use these instead of their alternatives:
| Prefer | Avoid |
|--------|-------|
| use | utilize |
| help | assist |
| show | demonstrate |

### Banned Words
Never use:
- ${avoidedWords.join('\n- ')}

## Sentence Structure

### Length
- Target: 15-22 words per sentence
- Vary length for rhythm
- After a complex sentence, follow with a short one

### Rhythm Pattern
${rhythmDescription}

## Document Structure

### Openings
${openingPatterns.map(p => `- **${p.type}** (${p.frequency}%): "${p.examples[0]}"`).join('\n')}

**Never open with:**
- "In this article, I will..."
- Dictionary definitions
- Throat-clearing ("It's important to understand that...")

### Closings
${closingPatterns.map(p => `- **${p.type}** (${p.frequency}%): "${p.examples[0]}"`).join('\n')}

## Exemplar Documents

These pieces best represent the target style:
${exemplarList}
```

## Step 5: Generate Machine-Readable Spec

Output: `~/writing-system/spec/StyleSpec.json`

```json
{
  "version": "1.0",
  "generatedAt": "2026-01-24T19:00:00Z",
  "rules": [
    {
      "id": "sentence-length",
      "category": "syntactic",
      "rule": "Keep sentences between 12 and 22 words",
      "validation": {
        "type": "range",
        "metric": "avgSentenceLength",
        "min": 12,
        "max": 22
      },
      "severity": "major"
    }
  ],
  "vocabulary": {
    "preferred": { "use": ["utilize"], "help": ["assist"] },
    "banned": ["synergy", "leverage"]
  },
  "exemplarIds": ["doc-123", "doc-456"]
}
```

## Step 6: Validate Spec Completeness

Check all required sections present:
- [ ] Voice & Tone
- [ ] Vocabulary (preferred + banned)
- [ ] Sentence Structure
- [ ] Document Structure (openings + closings)
- [ ] At least 3 exemplar references

## Completion

Style spec generated:
- `~/writing-system/spec/StyleSpec.md` (human-readable)
- `~/writing-system/spec/StyleSpec.json` (machine-readable)

Suggest:
- "Review StyleSpec.md and adjust rules if needed"
- "Run Validate workflow on a sample document"
- "Ready to use Apply workflow for generation"

## Skills Invoked

| Condition | Skill |
|-----------|-------|
| Example extraction | Uses LLM to find illustrating sentences |
