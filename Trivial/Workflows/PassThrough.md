# PassThrough Workflow

> **Trigger:** Simple questions, greetings, confirmations, low-confidence matches
> **Input:** User prompt that doesn't match any methodology skill
> **Output:** Direct response without methodology enforcement

## Step 1: Confirm Trivial Classification

This workflow activates when:
- Prompt is a simple question or clarification
- Prompt is a greeting or confirmation
- No other skill matched with confidence > 0.5
- User explicitly marked task as trivial

## Step 2: Respond Directly

No special behavior. Respond to the user's request without:
- Invoking Brainstorming
- Creating plans
- Following TDD
- Running verification

## Step 3: Log for Observability

The routing decision is logged so usage patterns can be analyzed.

## Completion

Response provided. No methodology constraints applied.

## Skills Invoked

| Step | Skill |
|------|-------|
| None | Pass-through, no skills invoked |
