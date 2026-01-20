# Capture Workflow

> **Trigger:** Problem solved confirmation ("that worked", "it's fixed", "working now", "problem solved")
> **Input:** Context from conversation about the solved problem
> **Output:** Documentation file in `plans/solutions/[category]/`

## Step 1: Detect Confirmation

Listen for trigger phrases indicating a problem was solved:
- "that worked"
- "it's fixed"
- "working now"
- "problem solved"

Skip trivial fixes (typos, simple config changes).

## Step 2: Gather Context

Collect from conversation:
- **Symptom**: What was the original problem?
- **Investigation**: What did we try?
- **Root cause**: Why did the problem occur?
- **Solution**: What fixed it?
- **Prevention**: How to avoid in future?

## Step 3: Check Existing Docs

```bash
grep -r "error phrase" plans/solutions/
```

Look for related issues to cross-reference.

## Step 4: Generate Documentation

Create file at `plans/solutions/[category]/[sanitized-symptom]-[YYYYMMDD].md`

Categories: build-errors, test-failures, performance-issues, config-issues, dependency-issues

## Completion

Documentation created and saved. User notified of file location.

## Skills Invoked

| Step | Skill |
|------|-------|
| None | Self-contained workflow |
