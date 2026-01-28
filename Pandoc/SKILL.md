---
name: Pandoc
description: Universal document converter using pandoc. USE WHEN convert document OR docx to markdown OR markdown to pdf OR batch convert files OR format conversion.
---

# Pandoc

Document conversion via pandoc CLI.

## Quick Reference

```bash
pandoc input.docx -t markdown -o output.md   # Word → Markdown
pandoc input.md -o output.pdf                 # Markdown → PDF (needs LaTeX)
pandoc input.md -o output.docx                # Markdown → Word
```

**Verify conversion:** Always check output file exists and is non-empty.

## Workflow Routing

| Workflow | Trigger | Description |
|----------|---------|-------------|
| **Convert** | "convert file", "transform to" | Single file conversion |
| **BatchConvert** | "batch convert", "convert folder" | Multiple file conversion |

## Examples

**Example 1: Single file**
```
User: "Convert report.docx to markdown"
-> pandoc report.docx -t markdown -o report.md
-> Verify: file exists, non-empty
```

**Example 2: Batch conversion**
```
User: "Convert all Word docs in ~/writing to markdown"
-> Use ~/convert-to-markdown.sh if exists
-> Or: for f in *.docx; do pandoc "$f" -t markdown -o "${f%.docx}.md"; done
-> Report: X converted, Y failed
```

**Example 3: PDF output fails**
```
-> Error: pdflatex not found
-> Response: "PDF conversion requires LaTeX. Install with: sudo apt install texlive"
```

## Related Skills

- **Writing** - Uses Pandoc to convert writing corpus to Markdown
- **Pdf** - Alternative for Markdown-to-PDF (uses Python libraries)
