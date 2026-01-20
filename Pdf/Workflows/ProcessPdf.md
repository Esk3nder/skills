# ProcessPdf Workflow

> **Trigger:** "create PDF", "extract from PDF", "merge PDFs", "fill PDF form"
> **Input:** User request describing PDF operation
> **Output:** Completed PDF operation or code example

## Step 1: Identify Operation Type

Determine the PDF task:
- **Create** - Generate new PDF from content
- **Extract** - Pull text or tables from existing PDF
- **Merge** - Combine multiple PDFs
- **Split** - Separate pages from PDF
- **Fill** - Complete PDF form fields (see `forms.md`)

## Step 2: Select Appropriate Tool

| Operation | Tool | Library |
|-----------|------|---------|
| Create PDF | reportlab | Python |
| Extract text | pdfplumber | Python |
| Extract tables | pdfplumber | Python |
| Merge/Split | pypdf | Python |
| Fill forms | pdf-lib | JavaScript |
| OCR scanned | pytesseract + pdf2image | Python |

## Step 3: Execute or Provide Code

For simple operations, execute directly.
For complex operations, provide code example from SKILL.md.

## Completion

PDF operation completed or code example provided.

## Skills Invoked

| Step | Skill |
|------|-------|
| Post-processing | TelegramDelivery (optional, if sending result) |
