# Ingest Workflow

> **Trigger:** "ingest corpus", "convert documents", "set up writing system"
> **Input:** Directory of raw documents (docx, txt, md)
> **Output:** Structured corpus at `~/writing-system/corpus/structured/`

## Step 1: Validate Input

```bash
# Check source directory exists
[[ -d "$SOURCE_DIR" ]] || exit 1

# Count documents
find "$SOURCE_DIR" -type f \( -name "*.docx" -o -name "*.txt" -o -name "*.md" \) | wc -l
```

Report: "Found N documents to ingest."

## Step 2: Convert to Markdown

Use Pandoc skill for conversion:

```bash
# Convert all docs to markdown
~/convert-to-markdown.sh "$SOURCE_DIR" ~/writing-system/corpus/raw/
```

Or invoke Pandoc BatchConvert workflow.

## Step 3: Parse to Structured JSON

For each markdown file, extract:

```typescript
interface StructuredDocument {
  id: string;                    // Hash of content
  source: string;                // Original filename
  content: string;               // Full text
  metadata: {
    wordCount: number;
    characterCount: number;
    paragraphCount: number;
    sentenceCount: number;
    estimatedReadingTime: number; // minutes
  };
  parsed: {
    title: string | null;        // First H1 or filename
    sentences: string[];         // Split sentences
    paragraphs: string[];        // Split paragraphs
    headings: { level: number; text: string }[];
  };
}
```

**Sentence splitting rules:**
- Split on `.!?` followed by space and capital
- Don't split on abbreviations (Mr., Dr., etc.)
- Don't split on decimal numbers

## Step 4: Generate Corpus Index

Create `corpus/index.json`:

```json
{
  "totalDocuments": 1000,
  "totalWords": 450000,
  "avgWordsPerDoc": 450,
  "ingestedAt": "2026-01-24T19:00:00Z",
  "documents": [
    { "id": "abc123", "source": "article-1.md", "wordCount": 500 }
  ]
}
```

## Step 5: Quality Check

Flag potential issues:
- Documents under 100 words (might be fragments)
- Documents over 10,000 words (might need splitting)
- Parsing failures (empty sentences array)

Report:
```
Ingested: 980 documents
Warnings: 15 (too short), 5 (parsing issues)
Skipped: 0

Corpus ready at: ~/writing-system/corpus/
Total words: 450,000
```

## Completion

Corpus is ready for analysis. Suggest:
- "Run Analyze workflow to extract style metrics"
- Review flagged documents manually

## Skills Invoked

| Condition | Skill |
|-----------|-------|
| Document conversion | Pandoc |
