---
name: Product
description: Product management toolkit with PRD generation, LennyHub RAG, and spec-driven development. USE WHEN writing PRD OR create specification OR product question OR ask Lenny OR roadmap planning OR analyze feedback OR sprint review OR spec-driven development.
---

# Product

Comprehensive product management skill combining PRD generation, 297 Lenny's Podcast transcripts via RAG, and spec-driven development for AI coding agents. Inspired by PM Toolkit patterns.

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **WritePRD** | `/prd` OR "write PRD" OR "create specification" OR "feature spec" | `Workflows/WritePRD.md` |
| **AskLenny** | `/ask-lenny` OR "what does Lenny say" OR "product question" OR "PM advice" | `Workflows/AskLenny.md` |
| **ContextEnrich** | `/context` OR "add context" OR "explore problem" OR "problem discovery" | `Workflows/ContextEnrich.md` |
| **SpecDriven** | `/spec` OR "spec kit" OR "for AI agents" OR "spec-driven" | `Workflows/SpecDriven.md` |
| **SprintReview** | `/sprint-review` OR "summarize sprint" OR "what shipped" | `Workflows/SprintReview.md` |
| **AnalyzeFeedback** | `/analyze-feedback` OR "user feedback" OR "synthesize feedback" | `Workflows/AnalyzeFeedback.md` |

## Core Capabilities

### 1. PRD Generation (`/prd`)
Transform vague ideas into structured PRDs applying:
- **4W1H Framework**: Who, What, When, Where, How
- **DHM Model**: Delight, Hard-to-copy, Margin-enhancing
- **Teresa Torres**: Opportunity Solution Trees, Assumption Testing
- **Marty Cagan**: Outcomes over output
- **GitHub Spec Kit**: DO NOT CHANGE sections for AI agents

### 2. LennyHub RAG (`/ask-lenny`)
Query 297 Lenny's Podcast transcripts for product wisdom:
- Prioritization frameworks
- Stakeholder management
- Product reviews
- Growth strategies
- Leadership insights

### 3. Problem Contextualization (`/context`)
Enrich problems with:
- Relevant frameworks from product leaders
- Common anti-patterns to avoid
- Assumptions that need testing
- Strategic alignment questions

### 4. Spec-Driven Development (`/spec`)
Generate GitHub Spec Kit compatible specifications:
1. **Specify**: Goals and user journeys
2. **Plan**: Architecture and constraints
3. **Tasks**: Small, reviewable units
4. **Implement**: AI agent execution

### 5. Sprint Review (`/sprint-review`)
Generate sprint summaries from git history:
- Commits analyzed and grouped
- Features shipped
- Technical debt addressed
- Blockers encountered

### 6. Feedback Analysis (`/analyze-feedback`)
Synthesize user feedback into actionable insights:
- Pattern extraction
- Sentiment analysis
- Feature request clustering
- Priority recommendations

## Data Sources

| Source | Location | Content |
|--------|----------|---------|
| Lenny Transcripts | `/home/skish/lennyhub-rag/data/` | 297 podcast transcripts |
| Best Practices Vol 1 | `/home/skish/canonical/prd-best-practices-lenny-podcast.md` | 7 themes |
| Best Practices Vol 2 | `/home/skish/canonical/prd-best-practices-lenny-podcast-v2.md` | 9 themes |
| Best Practices Vol 3 | `/home/skish/canonical/prd-best-practices-internet-v3.md` | Internet synthesis |
| LanceDB Vector Store | `~/.pm-toolkit/lennyhub.lance` | Local embeddings for semantic search |

## Tools

| Tool | Purpose |
|------|---------|
| `QueryLenny.ts` | Semantic/keyword search against LennyHub transcripts |
| `IngestTranscripts.ts` | Index transcripts into LanceDB for semantic search |
| `lib/embeddings.ts` | Ollama embedding utilities (nomic-embed-text) |

## Examples

**Example 1: Generate a PRD**
```
User: "/prd for a feature that lets users export their data"
→ Invokes WritePRD workflow
→ Queries LennyHub for export/data portability insights
→ Applies 4W1H and DHM frameworks
→ Generates structured PRD with success metrics and assumptions
```

**Example 2: Ask a product question**
```
User: "/ask-lenny how should I handle stakeholder conflicts?"
→ Invokes AskLenny workflow
→ RAG retrieves relevant transcript segments
→ Synthesizes answer with speaker attribution
→ Returns: "Adam Fishman says stakeholder management is a lifelong journey..."
```

**Example 3: Enrich a problem statement**
```
User: "/context users are churning after the first week"
→ Invokes ContextEnrich workflow
→ Retrieves activation/retention frameworks
→ Identifies assumptions to test
→ Returns enriched problem with discovery questions
```

**Example 4: Spec for AI agents**
```
User: "/spec convert this PRD to spec-kit format"
→ Invokes SpecDriven workflow
→ Transforms PRD into Specify → Plan → Tasks structure
→ Adds DO NOT CHANGE sections
→ Outputs AI-agent-ready specification
```

## Configuration

### Local RAG Setup (Ollama + LanceDB)

Semantic search uses **local** embeddings via Ollama - no external API keys needed.

```bash
# 1. Start Ollama (if not running)
ollama serve

# 2. Pull embedding model
ollama pull nomic-embed-text

# 3. Install dependencies
cd ~/.claude/skills/Product/Tools && bun install

# 4. Ingest transcripts (one-time, ~5 min for 297 files)
bun run IngestTranscripts.ts

# 5. Test semantic search
bun run QueryLenny.ts -q "autonomous teams"
```

### Environment Variables
```bash
# RAG configuration (all have sensible defaults)
OLLAMA_URL=http://localhost:11434        # Ollama server
OLLAMA_EMBED_MODEL=nomic-embed-text      # Embedding model (768 dims)
LANCEDB_PATH=~/.pm-toolkit/lennyhub.lance # Vector store location
LENNYHUB_DATA=/home/skish/lennyhub-rag/data # Transcript directory

# Optional integrations
LINEAR_API_KEY=                   # Linear sync
JIRA_API_TOKEN=                   # Jira integration
INTERCOM_ACCESS_TOKEN=            # Feedback ingestion
```

### Search Modes

| Mode | When Used | Quality |
|------|-----------|---------|
| **Semantic** | Ollama running + LanceDB indexed | High - finds concepts, not just keywords |
| **Keyword** | Fallback when semantic unavailable | Basic - keyword matching only |

## History Capture

All PRDs logged to `~/.claude/history/product.jsonl`:

```jsonl
{"timestamp":"2026-01-24T...","workflow":"WritePRD","input":"export feature","output_file":"/path/to/prd.md"}
{"timestamp":"2026-01-24T...","workflow":"AskLenny","query":"stakeholder conflicts","sources":["adam_fishman.txt"]}
```

## Related Skills

| Skill | Relationship |
|-------|--------------|
| **Brainstorming** | Invoke before WritePRD for design exploration |
| **WritingPlans** | Technical implementation plans (after PRD) |
| **Research** | Deep research when ContextEnrich insufficient |
| **Engineer** | Implements specs generated by SpecDriven |

## Framework Quick Reference

### DHM Model (Gibson Biddle, Netflix)
- **Delight**: Does this 10X improve experience?
- **Hard-to-copy**: Competitive moat?
- **Margin**: Business impact?

### Opportunity Solution Tree (Teresa Torres)
```
Outcome (root)
    └── Opportunities (branches)
            └── Solutions (leaves)
                    └── Assumption Tests
```

### Pre-Mortem (Shreyas Doshi)
- **Tiger**: Threat that will actually kill us
- **Paper Tiger**: Seeming threat we're not worried about
- **Elephant**: The thing nobody is talking about

### Dinosaur Brain (Ami Vora)
- Make a recommendation (don't just present info)
- Minimize information (only what's needed)
- Seek principles, not answers
