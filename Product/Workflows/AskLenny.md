# AskLenny Workflow

> **Trigger:** `/ask-lenny` OR "what does Lenny say" OR "product question" OR "PM advice"
> **Input:** Product management question
> **Output:** Answer synthesized from 297 Lenny's Podcast transcripts with speaker attribution

## Step 1: Parse the Question

Identify:
- **Topic**: What domain is this about? (prioritization, stakeholders, metrics, growth, etc.)
- **Intent**: Seeking advice, framework, or validation?
- **Specificity**: General guidance or specific situation?

## Step 2: Query LennyHub RAG

Use the QueryLenny tool with the user's question:

```bash
bun run $PAI_DIR/skills/Product/Tools/QueryLenny.ts --query "[user question]"
```

**If Qdrant is not running:**
```bash
# Start Qdrant
~/.qdrant/qdrant &
sleep 2
```

**Fallback: Direct transcript search**
```bash
# Search transcripts directly
grep -ri "[keywords]" /home/skish/lennyhub-rag/data/ --include="*.txt" -l | head -10
```

## Step 3: Retrieve Relevant Segments

RAG should return:
- Top 3-5 relevant transcript chunks
- Speaker names where identifiable
- Episode context if available

**Speaker Identification:**
Look for patterns like:
- "— **Speaker Name**"
- "[Speaker]: ..."
- Episode title containing guest name

## Step 4: Synthesize Answer

Structure the response:

```markdown
## What Lenny's Guests Say About [Topic]

### Key Insight
[Synthesized answer in 2-3 sentences]

### Detailed Perspectives

**[Speaker 1 Name]** ([Company/Role]):
> "[Direct quote from transcript]"

**[Speaker 2 Name]** ([Company/Role]):
> "[Direct quote from transcript]"

### Frameworks Mentioned
- [Framework 1]: [Brief explanation]
- [Framework 2]: [Brief explanation]

### Common Themes
1. [Theme that appears across multiple speakers]
2. [Another recurring theme]

### Potential Counter-Arguments
[If speakers disagree, note the tension]

### Sources
- [Episode/transcript reference 1]
- [Episode/transcript reference 2]
```

## Step 5: Add Context from Best Practices

Cross-reference with extracted best practices:
- `/home/skish/canonical/prd-best-practices-lenny-podcast.md`
- `/home/skish/canonical/prd-best-practices-lenny-podcast-v2.md`

Add relevant frameworks if applicable.

## Step 6: Present to User

Deliver the synthesized answer with:
- Direct quotes for credibility
- Speaker attribution
- Actionable takeaways

Ask: "Would you like me to go deeper on any of these perspectives?"

## Completion

Answer is complete when:
- [ ] Direct quotes from transcripts included
- [ ] Speaker attribution provided
- [ ] Synthesized into actionable insight
- [ ] Sources listed

## Example Interaction

**User:** "/ask-lenny how should I prioritize my roadmap?"

**Response:**
```markdown
## What Lenny's Guests Say About Roadmap Prioritization

### Key Insight
Prioritization isn't about deciding what's important—it's about saying out loud what's irrelevant. Sequence based on growth models, not stakeholder requests.

### Detailed Perspectives

**Adam Fishman** (Patreon, Lyft):
> "You have to be able to sequence the work much like in building a product. That sequence has to make sense based on your growth models."

**Jackie Bavaro** (Asana):
> "A roadmap in strategy is not a commitment. Instead, it's a way to double check if your plan makes any sense at all and is even anywhere near feasible."

**Ada Chen Rekhi** (SurveyMonkey):
> "Setting priorities isn't about deciding what is important—calling something important is too easy. Being able to say out loud that something is irrelevant is what matters."

### Frameworks Mentioned
- **Growth Model Sequencing**: Align roadmap to acquisition/retention/monetization metrics
- **Feasibility Check**: Use roadmap to validate vision timeline

### Common Themes
1. Deprioritization is harder and more valuable than prioritization
2. Roadmaps should connect to measurable outcomes, not stakeholder wishes
3. Strategy clarity must precede roadmap decisions
```

## Skills Invoked

| Step | Skill |
|------|-------|
| Step 2 | QueryLenny tool (internal) |
| Step 5 | Read best practices docs |
