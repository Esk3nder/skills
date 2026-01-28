# Analyze Workflow

> **Trigger:** "analyze style", "extract patterns", "profile my writing"
> **Input:** Structured corpus at `~/writing-system/corpus/structured/`
> **Output:** StyleProfile at `~/writing-system/analysis/StyleProfile.json`

## Step 1: Load Corpus

```typescript
const corpus = await loadCorpus('~/writing-system/corpus/structured/');
const allSentences = corpus.flatMap(d => d.parsed.sentences);
const allParagraphs = corpus.flatMap(d => d.parsed.paragraphs);
const allWords = allSentences.flatMap(s => tokenize(s));
```

## Step 2: Lexical Analysis

**Vocabulary metrics:**
```typescript
interface LexicalProfile {
  vocabularySize: number;           // Unique words
  typeTokenRatio: number;           // Vocabulary / total words
  avgWordLength: number;
  wordLengthDistribution: number[]; // [1-char, 2-char, ..., 15+]

  // Top 100 most frequent words (excluding stopwords)
  frequentWords: { word: string; count: number; frequency: number }[];

  // Words used 3x+ more than typical English baseline
  distinctiveWords: string[];

  // Common English words never used
  avoidedWords: string[];

  // Detected synonym preferences
  synonymPreferences: { preferred: string; avoided: string[] }[];
}
```

**Distinctive word detection:**
1. Calculate word frequency in corpus
2. Compare to baseline English frequency (use existing word frequency lists)
3. Flag words where `corpus_freq / baseline_freq > 3.0`

## Step 3: Syntactic Analysis

```typescript
interface SyntacticProfile {
  avgSentenceLength: number;        // Words per sentence
  sentenceLengthStdDev: number;
  sentenceLengthRange: [number, number];

  // Sentence complexity
  avgClausesPerSentence: number;
  compoundSentenceRatio: number;    // Sentences with conjunctions
  complexSentenceRatio: number;     // Sentences with subordinate clauses

  // Voice
  activeVoiceRatio: number;
  passiveVoiceRatio: number;

  // Sentence types
  declarativeRatio: number;
  interrogativeRatio: number;
  imperativeRatio: number;
  exclamatoryRatio: number;
}
```

**Active/passive detection:**
- Look for `was/were/been + past participle` patterns
- Look for `by + agent` constructions

## Step 4: Rhythmic Analysis

```typescript
interface RhythmicProfile {
  // Sentence length sequences (captures rhythm patterns)
  // e.g., [short, long, medium] = [1, 3, 2]
  typicalSequences: number[][];

  // Paragraph patterns
  avgSentencesPerParagraph: number;
  paragraphLengthVariance: number;

  // Detected cadence type
  cadenceType: 'staccato' | 'flowing' | 'building' | 'varied';
}
```

**Cadence detection:**
- `staccato`: Low sentence length variance, many short sentences
- `flowing`: High variance, longer average
- `building`: Sequences tend to increase in length
- `varied`: No strong pattern

## Step 5: Structural Analysis

```typescript
interface StructuralProfile {
  // Document-level
  avgSectionsPerDocument: number;
  avgParagraphsPerSection: number;

  // Opening patterns (first sentence/paragraph)
  openingPatterns: {
    type: 'question' | 'statement' | 'hook' | 'definition' | 'story';
    frequency: number;
    examples: string[];
  }[];

  // Closing patterns (last sentence/paragraph)
  closingPatterns: {
    type: 'call-to-action' | 'summary' | 'question' | 'implication' | 'callback';
    frequency: number;
    examples: string[];
  }[];

  // Transition phrases
  transitionPhrases: { phrase: string; count: number }[];
}
```

**Pattern detection (use LLM):**
For a sample of 50 openings, classify each:
```
Classify this opening sentence:
"${sentence}"

Type: question | bold_claim | specific_example | definition | story | statistic
```

## Step 6: Aggregate Profile

```typescript
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
```

## Step 7: Generate Report

Save:
- `~/writing-system/analysis/StyleProfile.json` (machine-readable)
- `~/writing-system/analysis/StyleReport.md` (human-readable summary)

Report format:
```markdown
# Style Analysis Report

Generated: 2026-01-24

## Summary
- Corpus: 1000 documents, 450,000 words
- Average sentence: 18.5 words
- Active voice: 78%
- Vocabulary distinctiveness: High

## Key Characteristics
1. Prefers short, punchy sentences (avg 18.5 words)
2. Strong active voice preference (78%)
3. Distinctive vocabulary: [list of words]
4. Opens with hooks, not definitions
5. Closes with implications or calls to action

## Detailed Metrics
[Full metrics tables]
```

## Completion

Style profile extracted. Suggest:
- "Review StyleReport.md for accuracy"
- "Run Codify workflow to generate style spec"
- "Tag your 20 best pieces as exemplars"

## Skills Invoked

| Condition | Skill |
|-----------|-------|
| Pattern classification | Uses LLM for opening/closing pattern detection |
