# GenerateReport Workflow

> **Trigger:** "skill analytics", "usage report", "skill usage summary"
> **Input:** Optional period (weekly/monthly) or date range
> **Output:** Skill usage report with statistics and recommendations

## Step 1: Run CLI Tool

```bash
bun run $PAI_DIR/skills/SkillUsageAnalytics/Tools/GenerateSummary.ts --period weekly
```

Options:
- `--period weekly` - Last 7 days
- `--period monthly` - Last 30 days
- `--since YYYY-MM-DD` - Custom start date

## Step 2: Interpret Results

Report contains:
- **Top 10 most used skills**
- **Underutilized skills** (in index but rarely invoked)
- **Summary statistics** (total invocations, unique skills)

## Step 3: Provide Recommendations

Based on usage patterns:
- Suggest underutilized skills for common tasks
- Identify potential skill gaps
- Recommend skill combinations

## Completion

Usage report generated and recommendations provided.

## Skills Invoked

| Step | Skill |
|------|-------|
| None | Self-contained analytics tool |
