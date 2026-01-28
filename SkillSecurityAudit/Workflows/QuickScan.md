# QuickScan Workflow

> **Trigger:** "quick scan [url]", "fast check", "quick audit"
> **Input:** GitHub URL (or gh:user/repo shorthand)
> **Output:** Pass/Fail with key concerns (faster than full audit)

## Purpose

Lightweight security scan for rapid triage. Use when you need a fast answer on whether a skill is obviously malicious. For comprehensive analysis, use the full AuditSkill workflow.

## Step 1: Fetch Critical Files Only

Only fetch files most likely to contain malicious code:

```bash
# Get SKILL.md, Tools/*.ts, and package.json
gh api repos/{owner}/{repo}/contents --jq '.[].name' | head -20
gh api repos/{owner}/{repo}/contents/Tools --jq '.[].name' 2>/dev/null
```

Focus on:
- `SKILL.md` - Main skill definition
- `Tools/*.ts` - Executable code
- `Workflows/*.md` - Workflow instructions
- `package.json` - Dependencies

## Step 2: Critical Pattern Scan

Check ONLY for critical/high patterns:

```regex
# Immediate blockers
curl.*\|.*sh
wget.*\|.*bash
eval\s*\(
rm\s+-rf\s+[/~]
cat.*\.ssh
cat.*\.aws
child_process\.exec
```

## Step 3: Quick Risk Assessment

| Finding | Result |
|---------|--------|
| Any critical pattern | **FAIL** |
| Multiple high patterns (3+) | **FAIL** |
| 1-2 high patterns | **REVIEW** |
| No concerning patterns | **PASS** |

## Step 4: Return Result

Quick format response:

```
QUICK SCAN: [repo]
Status: [PASS ✅ / REVIEW 🟡 / FAIL 🔴]
Files checked: [count]
Time: [seconds]

[If FAIL/REVIEW: List top 3 concerns]

Recommendation: [brief action]
```

## Completion

For FAIL results, recommend full AuditSkill workflow.
For PASS results, user can proceed or request full audit.

## Skills Invoked

| Condition | Skill |
|-----------|-------|
| FAIL/REVIEW result | Recommend AuditSkill workflow |
| PASS result | Optionally CreateSkill |
