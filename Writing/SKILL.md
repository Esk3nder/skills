---
name: Writing
description: Production-grade writing style system. USE WHEN writing content OR extracting style from corpus OR validating writing style OR analyzing writing patterns OR creating style guidelines.
---

# Writing

Production-grade pipeline for extracting, codifying, and applying writing style from a corpus.

## Architecture

```
INGEST → ANALYZE → CODIFY → VALIDATE → APPLY
```

| Stage | Purpose | Output |
|-------|---------|--------|
| Ingest | Convert raw docs to structured corpus | `corpus/structured/*.json` |
| Analyze | Extract quantitative style metrics | `StyleProfile.json` |
| Codify | Generate human+machine readable spec | `StyleSpec.md` + `.json` |
| Validate | Test output against spec | Pass/Fail + violations |
| Apply | Generate content matching style | Styled output |

## Data Locations

```
~/writing-system/
├── corpus/raw/           # Original documents
├── corpus/structured/    # Parsed JSON
├── analysis/             # Style profiles
├── spec/                 # Style specifications
├── exemplars/            # Best 20 annotated examples
└── validation/           # Test cases
```

## Workflow Routing

| Workflow | Trigger | Description |
|----------|---------|-------------|
| **Ingest** | "ingest corpus", "convert documents" | Raw docs → structured JSON |
| **Analyze** | "analyze style", "extract patterns" | Corpus → StyleProfile |
| **Codify** | "create style spec", "codify style" | Profile → StyleSpec |
| **Validate** | "validate writing", "check style" | Content → Pass/Fail |
| **Apply** | "write in style", "apply style" | Request → Styled output |

## CLI Tools

```bash
# Ingest documents
bun run $PAI_DIR/skills/Writing/Tools/Ingest.ts ~/raw-docs ~/corpus

# Analyze corpus
bun run $PAI_DIR/skills/Writing/Tools/Analyze.ts ~/corpus

# Validate content
bun run $PAI_DIR/skills/Writing/Tools/Validate.ts content.md --spec style-spec.json

# Full pipeline
bun run $PAI_DIR/skills/Writing/Tools/Pipeline.ts --corpus ~/docs --output ~/writing-system
```

## Examples

**Example 1: Initial setup from corpus**
```
User: "I have 1000 articles in ~/obsidian/writing. Set up my style system."
→ Invokes Ingest workflow (convert to structured)
→ Invokes Analyze workflow (extract metrics)
→ Invokes Codify workflow (generate spec)
→ Output: Complete style system at ~/writing-system/
```

**Example 2: Write new content**
```
User: "Write a thread about DeFi yields in my style"
→ Invokes Apply workflow
→ Loads StyleSpec + retrieves relevant exemplars
→ Generates content
→ Invokes Validate workflow (automatic)
→ Output: Styled thread, validated
```

**Example 3: Validate existing draft**
```
User: "Check if this draft matches my style"
→ Invokes Validate workflow
→ Checks against StyleSpec rules
→ Output: Score + specific violations with line numbers
```

**Example 4: Evolve style spec**
```
User: "Add this article to my exemplars and update the spec"
→ Re-runs Analyze on expanded corpus
→ Diffs against existing spec
→ Proposes spec updates for approval
```

## Style Dimensions

The system analyzes six orthogonal dimensions:

| Dimension | Metrics |
|-----------|---------|
| **Lexical** | Vocabulary size, distinctive words, avoided words, synonym preferences |
| **Syntactic** | Sentence length, active/passive ratio, complexity |
| **Rhythmic** | Length variance, paragraph cadence, sentence sequences |
| **Structural** | Section patterns, argument flow, paragraph length |
| **Rhetorical** | Opening hooks, transitions, closings |
| **Semantic** | Metaphor patterns, analogy usage, topic framing |

## Related Skills

- **Pandoc** - Used by Ingest for document conversion
- **Pdf** - Alternative output format for styled content
- **DeepResearch** - May invoke Writing for report generation
