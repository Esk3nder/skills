# BatchConvert Workflow

> **Trigger:** "batch convert", "convert folder", "convert all files"
> **Input:** Source directory, target format, optional output directory
> **Output:** Converted files with summary report

## Step 1: Scan

```bash
find "$SOURCE" -type f \( -name "*.docx" -o -name "*.doc" -o -name "*.txt" \) | wc -l
```

Report count before proceeding: "Found X files to convert."

## Step 2: Execute

Prefer existing script if available:
```bash
if [[ -x ~/convert-to-markdown.sh ]]; then
    ~/convert-to-markdown.sh "$SOURCE" "$OUTPUT"
else
    # Inline conversion
    for f in "$SOURCE"/**/*.docx; do
        pandoc "$f" -t markdown -o "${f%.docx}.md"
    done
fi
```

Track: converted, skipped (exists), failed (with error)

## Step 3: Verify & Report

```
=== Batch Complete ===
Converted: 42
Skipped:   3 (already existed)
Failed:    2

Failed:
- doc1.docx: pandoc error: ...
- doc2.docx: file not readable
```

## Completion

Report totals. If failures, list them with errors.

## Skills Invoked

| Condition | Skill |
|-----------|-------|
| None | This workflow does not invoke other skills |
