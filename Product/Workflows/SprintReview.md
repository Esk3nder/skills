# SprintReview Workflow

> **Trigger:** `/sprint-review` OR "summarize sprint" OR "what shipped"
> **Input:** Optional date range, branch, or project scope
> **Output:** Sprint summary based on actual git commit history

## Step 1: Determine Scope

Ask user or infer:
- **Date range**: Last 2 weeks default, or specify (e.g., "last month")
- **Branch**: main/master default, or specify feature branch
- **Repository**: Current directory default, or specify path

## Step 2: Gather Commit Data

```bash
# Get commits in date range
git log --since="2 weeks ago" --oneline --no-merges

# Get detailed commit info with author
git log --since="2 weeks ago" --format="%h|%s|%an|%ad" --date=short --no-merges

# Get files changed
git log --since="2 weeks ago" --stat --no-merges
```

## Step 3: Categorize Changes

Group commits into categories:

| Category | Patterns |
|----------|----------|
| **Features** | feat:, add:, new:, implement |
| **Bug Fixes** | fix:, bugfix:, patch: |
| **Refactoring** | refactor:, clean:, improve: |
| **Documentation** | docs:, readme, changelog |
| **Tests** | test:, spec:, coverage |
| **Infrastructure** | ci:, deploy:, config:, chore: |
| **Performance** | perf:, optimize:, speed |

## Step 4: Identify Key Accomplishments

From categorized commits:
1. **Major features shipped** (user-facing changes)
2. **Critical bugs fixed** (impact on users)
3. **Technical debt addressed** (code quality improvements)
4. **Infrastructure improvements** (reliability, performance)

## Step 5: Detect Blockers & Challenges

Look for signals:
- Reverted commits: `git log --grep="revert" --since="2 weeks ago"`
- Multiple attempts at same fix: Similar commit messages
- WIP commits that never completed
- Long gaps between related commits

## Step 6: Generate Sprint Review

```markdown
# Sprint Review: [Date Range]

## Summary
[2-3 sentence overview of sprint accomplishments]

---

## Features Shipped
| Feature | Description | Commits |
|---------|-------------|---------|
| [Name] | [What it does] | [count] |

### Feature Details
**[Feature 1]**
- [What was built]
- [Key commits: hash, hash]
- [Impact/outcome]

---

## Bug Fixes
| Bug | Resolution | Impact |
|-----|------------|--------|
| [Issue] | [Fix] | [Users affected] |

---

## Technical Improvements
- **Refactoring:** [Summary]
- **Performance:** [Summary]
- **Test coverage:** [Summary]

---

## Infrastructure
- [CI/CD changes]
- [Deployment updates]
- [Configuration changes]

---

## Metrics
| Metric | Value |
|--------|-------|
| Total commits | [N] |
| Contributors | [N] |
| Files changed | [N] |
| Lines added | [N] |
| Lines removed | [N] |

---

## Blockers & Challenges
- [Challenge 1 and how it was resolved]
- [Blocker that remains unresolved]

---

## Carry-Over to Next Sprint
- [Incomplete work]
- [Known issues to address]

---

## Team Recognition
[Contributors and their key contributions]

---

*Generated from git history on [date]*
```

## Step 7: Optional Enhancements

If Linear/Jira integration configured:
- Cross-reference commits with tickets
- Pull ticket descriptions for richer context
- Link to completed issues

## Completion

Sprint review is complete when:
- [ ] Commits categorized
- [ ] Key features identified
- [ ] Bug fixes documented
- [ ] Metrics calculated
- [ ] Blockers noted

## Skills Invoked

| Step | Skill |
|------|-------|
| Step 2 | Bash (git commands) |
| Step 7 | Linear/Jira API (if configured) |
