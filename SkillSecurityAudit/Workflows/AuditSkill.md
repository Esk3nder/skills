# AuditSkill Workflow

> **Trigger:** "audit skill [url]", "vet this skill", "check skill safety", "security check [url]"
> **Input:** GitHub URL (or gh:user/repo shorthand)
> **Output:** Security audit report with risk level and recommendation

## Multi-Skill Repository Support

When the target repository contains multiple skills:

1. **Default behavior:** List all discovered skills with metadata
2. **`--all` flag:** Audit every skill and provide aggregate report
3. **`--skill "Name"` flag:** Audit specific skill by name

The tool discovers skills by searching for `SKILL.md` files recursively.

## Step 1: Parse and Validate URL

Extract repository information from input:
- Full URL: `https://github.com/user/repo`
- Shorthand: `gh:user/repo`
- With path: `https://github.com/user/repo/tree/main/skills/SkillName`

Validate:
- URL is a valid GitHub repository
- Repository is public (or user has access)
- Repository exists

```bash
# Validate repo exists
gh repo view user/repo --json name,url 2>/dev/null
```

## Step 2: Fetch Repository Contents

Clone or fetch repository contents for analysis:

```bash
# Create temp directory for analysis
AUDIT_DIR=$(mktemp -d)

# Shallow clone (minimal footprint)
gh repo clone user/repo "$AUDIT_DIR" -- --depth 1 --single-branch

# Or if specific path provided, use sparse checkout
```

**Files to analyze:**
- `*.md` - Skill definitions, workflow instructions
- `*.ts` - TypeScript tools
- `*.js` - JavaScript code
- `*.sh` - Shell scripts
- `*.yaml`, `*.yml` - Configuration
- `*.json` - Configuration, package files

## Step 3: Static Analysis - Command Patterns

Scan all code files for dangerous command patterns:

### Critical Patterns (BLOCK)
```regex
# Shell execution with external input
\$\(.*\$\{?[A-Z_]+\}?.*\)
`.*\$\{?[A-Z_]+\}?.*`

# Piped execution
curl.*\|.*sh
wget.*\|.*sh
curl.*\|.*bash
eval\s*\(

# Destructive commands
rm\s+-rf\s+[/~]
rm\s+-rf\s+\$
git\s+reset\s+--hard
git\s+clean\s+-fd

# Credential theft
cat.*\.ssh
cat.*\.aws
cat.*\.env
```

### High Risk Patterns (FLAG)
```regex
# Network operations in tools
fetch\(
axios\.
http\.request
net\.connect
WebSocket

# Process spawning
child_process
spawn\(
exec\(
execSync\(

# File system operations on sensitive paths
readFileSync.*\.ssh
readFileSync.*\.aws
readFileSync.*\.env
writeFileSync.*\.bashrc
writeFileSync.*\.zshrc
```

### Medium Risk Patterns (NOTE)
```regex
# Environment access
process\.env
Deno\.env
Bun\.env

# Dynamic code execution
Function\(
new\s+Function

# Base64 operations (potential obfuscation)
btoa\(
atob\(
Buffer\.from.*base64
```

## Step 4: Static Analysis - Data Exfiltration

Check for patterns indicating data theft:

```regex
# Webhook/callback URLs
https?://[^\s"']+webhook
https?://[^\s"']+callback
https?://[^\s"']+exfil

# External HTTP with file content
fetch.*readFileSync
axios.*readFileSync
http\.request.*readFileSync

# Encoded data transmission
JSON\.stringify.*fetch
base64.*fetch
btoa.*fetch
```

## Step 5: Static Analysis - Secrets Exposure

Scan for hardcoded credentials:

```regex
# API Keys
['"](sk-|pk-|api[_-]?key|apikey)[a-zA-Z0-9]{20,}['"]
['"](ghp_|gho_|ghs_|ghr_)[a-zA-Z0-9]{36}['"]
['"]AKIA[A-Z0-9]{16}['"]

# Tokens
['"](xox[baprs]-[a-zA-Z0-9-]+)['"]
['"]Bearer\s+[a-zA-Z0-9._-]+['"]

# Private keys
-----BEGIN.*PRIVATE KEY-----
-----BEGIN RSA PRIVATE KEY-----
```

## Step 6: Static Analysis - Path Access

Check for access to sensitive system paths:

```regex
# Zero-access paths (per DamageControl)
~?/?\.ssh/
~?/?\.aws/
~?/?\.gnupg/
~?/?\.config/gh/

# Read-only paths
/etc/passwd
/etc/shadow
~?/?\.bashrc
~?/?\.zshrc
~?/?\.profile

# PAI paths
~?/?\.claude/settings\.json
~?/?\.claude/\.env
```

## Step 7: Static Analysis - Persistence

Check for persistence mechanisms:

```regex
# Cron
crontab
/etc/cron

# Startup scripts
\.bashrc
\.zshrc
\.profile
\.bash_profile

# Systemd
systemctl
/etc/systemd

# PAI hooks
hooks\.json
PreToolUse
PostToolUse
```

## Step 8: Code Quality Analysis

Assess code quality signals:

- **Obfuscation indicators:**
  - Variable names like `_0x`, `_$`, single letters
  - Long strings of hex/base64
  - Minified code without source maps

- **Suspicious file patterns:**
  - Binary files in unexpected locations
  - Files with double extensions
  - Hidden files (starting with .)

- **Size anomalies:**
  - Very large encoded strings
  - Unusually large tool files
  - Many small fragmented files

## Step 9: Calculate Risk Score

Aggregate findings into risk level:

| Finding Type | Points |
|--------------|--------|
| Critical pattern | +100 |
| High risk pattern | +25 |
| Medium risk pattern | +5 |
| Low risk pattern | +1 |
| Obfuscation detected | +50 |
| Hardcoded secrets | +75 |
| Persistence attempt | +50 |

**Risk Levels:**
- **CRITICAL** (100+): Active malware indicators
- **HIGH** (50-99): Dangerous patterns
- **MEDIUM** (20-49): Suspicious patterns
- **LOW** (1-19): Minor concerns
- **CLEAN** (0): No issues

## Step 10: Generate Report

Create comprehensive security report:

```markdown
# Security Audit Report: [SkillName]

**Audit Date:** [timestamp]
**Auditor:** SkillSecurityAudit v1.0

## Summary

| Metric | Value |
|--------|-------|
| Source | [GitHub URL] |
| Risk Level | [LEVEL] |
| Risk Score | [score]/100 |
| Files Analyzed | [count] |
| Issues Found | [count] |

## Risk Assessment

[Color-coded risk level badge]

### Critical Findings
[List any CRITICAL findings with file:line references]

### High Risk Findings
[List any HIGH findings with file:line references]

### Medium Risk Findings
[List any MEDIUM findings with file:line references]

### Low Risk Findings
[List any LOW findings with file:line references]

## Detailed Analysis

### Command Execution
[Analysis of shell/process execution patterns]

### Network Activity
[Analysis of HTTP/WebSocket usage]

### File System Access
[Analysis of file read/write operations]

### Sensitive Data Handling
[Analysis of credential/secrets handling]

### Code Quality
[Assessment of obfuscation/quality signals]

## Files Reviewed

| File | Risk | Findings |
|------|------|----------|
| [filename] | [level] | [summary] |

## Recommendation

**[SAFE TO INGEST / REVIEW REQUIRED / DO NOT INGEST]**

[Detailed recommendation text]

## Remediation Suggestions

[If issues found, suggest fixes]

---
*Generated by SkillSecurityAudit*
```

## Step 11: Cleanup

Remove temporary files:

```bash
rm -rf "$AUDIT_DIR"
```

## Completion

Return the security report to the user with:
1. Clear risk level
2. Actionable recommendation
3. Detailed findings for review

**If CRITICAL or HIGH risk:**
- Explicitly warn user
- Recommend against ingestion
- Provide specific threat details

**If MEDIUM risk:**
- Flag for manual review
- Explain each concern
- Let user decide

**If LOW or CLEAN:**
- Approve for ingestion
- Note any minor concerns
- Proceed with confidence

## Skills Invoked

| Condition | Skill |
|-----------|-------|
| After audit passes | CreateSkill (for ingestion) |
| Runtime protection | DamageControl (after ingestion) |
