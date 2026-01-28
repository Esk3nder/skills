# Apply Workflow

> **Trigger:** "write in style", "apply style", "generate content", "write about"
> **Input:** Writing request
> **Output:** Styled content (validated, stress-tested)

## Overview

```
RESEARCH → STRESS-TEST → INTERVIEW → GENERATE → VALIDATE
     ↓          ↓
  RAG +     RedTeam +
 Agents     Council
```

The key insight: **research what exists, stress-test what you'll claim, then write.** Most writing workflows skip the stress-test, producing surface-level content that collapses under scrutiny.

---

## Step 1: Deep Research (Parallel)

### 1.1 RAG Corpus Search
```bash
bun run ~/.claude/skills/Writing/Tools/Search.ts "${userRequest}" --top-k 10 --json
```

### 1.2 Spawn Research Agents
```typescript
const agents = await Promise.all([
  Task({
    subagent_type: "ClaudeResearcher",
    prompt: `Deep research on: "${userRequest}"
      1. Key sub-claims or components
      2. Evidence supporting AND contradicting
      3. Strongest counter-arguments
      4. Recent developments (last 6 months)
      5. Specific projects, people, data points
      6. Common misconceptions`
  }),
  Task({
    subagent_type: "Explore",
    prompt: `Corpus analysis for: "${userRequest}"
      - Prior positions taken
      - Related topics covered
      - Typical voice/angle for this subject`
  })
]);
```

### 1.3 Synthesize Research
```
Research Summary:
- Core thesis components: [sub-arguments]
- Key evidence: [examples, data]
- Counter-arguments: [strongest objections]
- Open questions: [unclear areas]
```

---

## Step 2: Thesis Stress-Test (NEW - CRITICAL)

**Before writing, attack your own thesis.** This prevents publishing weak arguments that collapse under scrutiny.

### 2.1 Decompose into Claims

Break the thesis into 12-24 atomic claims:
```
CLAIM 1: [First discrete assertion]
CLAIM 2: [Second discrete assertion]
...
```

Each claim should be:
- Self-contained
- Specific (not vague)
- Attackable (a critic could challenge it)

### 2.2 Run RedTeam-Lite (16 agents)

Launch 4 batches of 4 agents in parallel:

```typescript
const redteam = await Promise.all([
  Task({ subagent_type: "Engineer", prompt: `4 engineer perspectives on thesis...` }),
  Task({ subagent_type: "Architect", prompt: `4 architect perspectives on thesis...` }),
  Task({ subagent_type: "Pentester", prompt: `4 adversarial perspectives on thesis...` }),
  Task({ subagent_type: "Intern", prompt: `4 fresh-eyes perspectives on thesis...` })
]);
```

Each agent identifies:
- Strongest point FOR (cite claim #)
- Strongest point AGAINST (cite claim #)
- One-sentence verdict

### 2.3 Run Council Quick-Debate

Launch 4 council members for 2-round debate:

```typescript
const council = await Promise.all([
  Task({ subagent_type: "Architect", prompt: "Architectural analysis of thesis..." }),
  Task({ subagent_type: "Designer", prompt: "UX/adoption analysis of thesis..." }),
  Task({ subagent_type: "Engineer", prompt: "Implementation reality check..." }),
  Task({ subagent_type: "ClaudeResearcher", prompt: "Evidence assessment..." })
]);
```

### 2.4 Synthesize Stress-Test Results

**Output:**
```
=== THESIS STRESS-TEST ===

STRONG CLAIMS (5+ agents validated):
- Claim #X: [description] - Why it's strong
- Claim #Y: [description] - Why it's strong

WEAK CLAIMS (5+ agents attacked):
- Claim #A: [description] - The vulnerability
- Claim #B: [description] - The vulnerability

STEELMAN (8 points):
1. [Strongest formulation of your argument]
2. [Best supporting evidence]
...

COUNTER-ARGUMENT (8 points):
1. [Strongest objection]
2. [Key weakness to address]
...

COUNCIL CONSENSUS:
- Where experts agreed
- Where experts disagreed
- Recommended approach
```

### 2.5 Integrate Into Writing Strategy

Based on stress-test, determine:
1. **Lead with strong claims** - Open with what's unassailable
2. **Preempt weak claims** - Address counter-arguments directly
3. **Steelman your position** - Use the strongest formulation
4. **Acknowledge limitations** - Don't overclaim

---

## Step 3: Substantive Discovery Interview

Now ask questions informed by BOTH research AND stress-test:

### Question Design (Post-Stress-Test)

```
Based on my research AND stress-testing your thesis:

1. **Strong Claims**: These held up under scrutiny -
   [ ] Lead with claim about X (validated by 8 agents)
   [ ] Lead with claim about Y (council consensus)
   [ ] Different emphasis

2. **Weak Claims**: These face strong counter-arguments -
   [ ] Address head-on and defend
   [ ] Acknowledge and scope around
   [ ] Omit (narrow the thesis)

3. **Counter-Argument Strategy**: The strongest objection is Z -
   [ ] Preempt in opening
   [ ] Address in dedicated section
   [ ] Acknowledge in closing

4. **Scope**: Given the stress-test, should we -
   [ ] Narrow the thesis (stronger, more defensible)
   [ ] Keep broad (acknowledge more limitations)
```

---

## Step 4: Generate with Full Context

Build prompt with stress-test results:

```typescript
const prompt = `
# Style Guidelines
${styleSpec}

# Reference Examples (match this voice)
${exemplars}

# Research Context
${researchFindings}

# STRESS-TEST RESULTS (CRITICAL)
## Strong Claims to Emphasize:
${strongClaims}

## Weak Claims to Handle Carefully:
${weakClaims}

## Steelman Your Position:
${steelman}

## Counter-Arguments to Preempt:
${counterArguments}

## Council Consensus:
${councilFindings}

# Writing Brief
Topic: ${request}
Thesis focus: ${interview.thesisFocus}
Counter-argument approach: ${interview.counterStrategy}
Length: ${interview.length}

# Task
Write the content. Lead with strong claims. Preempt counter-arguments.
Don't overclaim on weak points. Use steelman formulation.
`;
```

---

## Step 5: Validate & Present

1. Run `Validate.ts` for style compliance
2. Present with stress-test summary:

```
=== Generated Content ===
[Content]

=== Validation ===
Style Score: 94/100 ✓

=== Stress-Test Integration ===
- Strong claims emphasized: 3/4 ✓
- Counter-arguments addressed: 2/3 ✓
- Steelman formulation used: Yes ✓
- Overclaiming avoided: Yes ✓

=== Would you like me to: ===
[ ] Strengthen weak sections
[ ] Add more counter-argument handling
[ ] Expand on strong claims
[ ] Regenerate with different emphasis
```

---

## Step 6: Iteration

Keep full context for revisions:
- Research findings
- Stress-test results (steelman, counter-arguments, weak/strong claims)
- Interview answers
- Exemplars

---

## Skills Invoked

| Phase | Tool/Skill |
|-------|------------|
| Corpus search | `Search.ts` (RAG) |
| Topic research | ClaudeResearcher |
| Prior positions | Explore agent |
| **Thesis stress-test** | **RedTeam (16 agents) + Council (4 agents)** |
| Interview | AskUserQuestion |
| Generation | StyleSpec + Exemplars |
| Validation | `Validate.ts` |

---

## Key Principles

1. **Research first** - Know what exists before claiming
2. **Stress-test second** - Attack your thesis before publishing
3. **Lead with strength** - Open with claims that survived scrutiny
4. **Preempt objections** - Address counter-arguments proactively
5. **Don't overclaim** - Scope to what's defensible

---

## When to Skip Stress-Test

For quick pieces (threads, short updates), the full stress-test may be overkill. Skip if:
- Length < 500 words
- Topic is factual/descriptive (not argumentative)
- User explicitly requests fast mode

For anything making a substantive ARGUMENT, always stress-test.

---

## Example: Before vs After

**WITHOUT Stress-Test:**
"Crypto makes machine intelligence programmable because of five primitives..."
→ Surface-level, easily attacked, weak formulation

**WITH Stress-Test:**
"Crypto primitives are optimal—not necessary—for the specific case of trustless cross-border agent settlement. Traditional infrastructure handles 95% of coordination needs. But for the remaining 5% where trust assumptions fail, blockchain's atomic settlement and permissionless access provide properties no centralized system can replicate. Here's where that matters..."
→ Defensible, acknowledges limitations, leads with strength
