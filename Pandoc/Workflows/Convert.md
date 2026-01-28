# Convert Workflow

> **Trigger:** "convert file", "transform to", single file conversion
> **Input:** Source file path, target format or target file path
> **Output:** Converted file at specified location

## Step 1: Parse Request

Determine:
- Input file (must exist)
- Output format (from explicit format, target extension, or default to markdown)
- Output path (same directory, same name, new extension)

## Step 2: Check Prerequisites

For PDF output only:
```bash
which pdflatex || which wkhtmltopdf || which weasyprint
```
If missing, inform user: "PDF requires LaTeX: `sudo apt install texlive`"

## Step 3: Execute

```bash
pandoc "$INPUT" -t "$FORMAT" -o "$OUTPUT"
```

## Step 4: Verify (Feedback Loop)

```bash
# Check file created
[[ -f "$OUTPUT" ]] || echo "ERROR: Output not created"

# Check non-empty
[[ -s "$OUTPUT" ]] || echo "WARNING: Output is empty"
```

Report result:
```
Converted: input.docx → output.md (12 KB)
```

## Completion

Success: Report file path and size.
Failure: Report error with suggestion (install dependency, check input file, etc.)

## Skills Invoked

| Condition | Skill |
|-----------|-------|
| None | This workflow does not invoke other skills |
