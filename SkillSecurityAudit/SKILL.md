---
name: SkillSecurityAudit
description: Security vetting for external skills before PAI ingestion. USE WHEN audit skill OR vet skill OR security check skill OR analyze github skill OR review external skill OR safe to ingest. Fetches code from GitHub, analyzes for malicious patterns, command injection, data exfiltration, secrets exposure, and provides risk assessment.
---

# SkillSecurityAudit

Security-first skill vetting system that analyzes external skills (from GitHub URLs) before allowing ingestion into PAI. Runs comprehensive security analysis to identify malicious patterns, command injection vectors, data exfiltration risks, and other threats.

**Announce at start:** "I'm using the SkillSecurityAudit skill to analyze this skill for security risks before ingestion."

## Why This Exists

External skills can execute arbitrary code within PAI's context. A malicious skill could:
- Execute shell commands (rm -rf, curl to exfil data)
- Read sensitive files (~/.ssh, ~/.aws, .env)
- Modify PAI configuration
- Establish persistence
- Exfiltrate credentials or data

**This skill is your first line of defense.**

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **AuditSkill** | "audit skill [url]", "vet this skill", "check skill safety" | `Workflows/AuditSkill.md` |
| **QuickScan** | "quick scan [url]", "fast check" | `Workflows/QuickScan.md` |

## Risk Levels

| Level | Color | Meaning | Action |
|-------|-------|---------|--------|
| **CRITICAL** | 🔴 | Active malware indicators | **DO NOT INGEST** |
| **HIGH** | 🟠 | Dangerous patterns detected | Manual review required |
| **MEDIUM** | 🟡 | Suspicious patterns | Review before ingesting |
| **LOW** | 🟢 | Minor concerns | Safe with awareness |
| **CLEAN** | ✅ | No issues detected | Safe to ingest |

## Security Checks Performed

### 1. Command Injection Analysis
- Shell execution patterns (`Bash`, `exec`, `spawn`, `system`)
- Dangerous commands (`rm`, `curl | bash`, `wget | sh`, `eval`)
- Encoded/obfuscated commands
- Environment variable manipulation

### 2. Data Exfiltration Detection
- Outbound HTTP requests in tool code
- File read operations on sensitive paths
- Credential harvesting patterns
- Webhook/callback URLs
- Base64 encoding of sensitive data

### 3. Secrets Exposure Check
- Hardcoded API keys
- Embedded credentials
- Token patterns (AWS, GitHub, etc.)
- Private key material

### 4. Path Access Analysis
- Access to ~/.ssh/, ~/.aws/, ~/.gnupg/
- Environment file reads (.env, .envrc)
- PAI configuration modifications
- System file access (/etc/passwd, /etc/shadow)

### 5. Persistence Mechanisms
- Cron job creation
- Startup script modification
- Hook installation
- Alias/function hijacking

### 6. Code Quality Signals
- Obfuscated code
- Minified TypeScript/JavaScript
- Unusual file extensions
- Binary blobs
- Large encoded strings

## Report Format

```markdown
# Security Audit Report: [SkillName]

## Summary
- **Source:** [GitHub URL]
- **Risk Level:** [CRITICAL/HIGH/MEDIUM/LOW/CLEAN]
- **Files Analyzed:** [count]
- **Issues Found:** [count]

## Critical Findings
[If any CRITICAL issues]

## High Risk Findings
[If any HIGH issues]

## Medium Risk Findings
[If any MEDIUM issues]

## Low Risk Findings
[If any LOW issues]

## Analysis Details

### Command Patterns
[Details]

### Network Activity
[Details]

### File Access
[Details]

### Code Quality
[Details]

## Recommendation
[SAFE TO INGEST / MANUAL REVIEW REQUIRED / DO NOT INGEST]

## Raw Scan Output
[Technical details for review]
```

## Examples

**Example 1: Audit a GitHub skill**
```
User: "Audit https://github.com/someone/cool-skill"
→ Fetches repository contents
→ Analyzes all .md, .ts, .js files
→ Checks for malicious patterns
→ Generates security report
→ Returns risk level and recommendation
```

**Example 2: Quick scan before ingesting**
```
User: "Quick scan this skill: gh:user/repo"
→ Performs lightweight security scan
→ Returns pass/fail with key concerns
→ Faster than full audit
```

**Example 3: Blocked malicious skill**
```
User: "Vet https://github.com/attacker/backdoor-skill"
→ Detects curl piped to bash in tool
→ Finds data exfiltration to external webhook
→ Returns CRITICAL risk level
→ Provides detailed findings
→ Recommends DO NOT INGEST
```

## CLI Tool

```bash
# List skills in a repository (default)
bun run $PAI_DIR/skills/SkillSecurityAudit/Tools/AuditSkill.ts https://github.com/user/repo

# Audit all skills in repository
bun run $PAI_DIR/skills/SkillSecurityAudit/Tools/AuditSkill.ts --all https://github.com/user/repo

# Audit specific skill by name
bun run $PAI_DIR/skills/SkillSecurityAudit/Tools/AuditSkill.ts --skill "SkillName" https://github.com/user/repo

# Quick scan (critical/high only)
bun run $PAI_DIR/skills/SkillSecurityAudit/Tools/AuditSkill.ts --quick --all https://github.com/user/repo

# Output JSON
bun run $PAI_DIR/skills/SkillSecurityAudit/Tools/AuditSkill.ts --json --all https://github.com/user/repo
```

**Multi-Skill Repository Support:**
- Automatically discovers all `SKILL.md` files recursively
- Lists skills with metadata (Tools, Workflows, file counts)
- Can audit individual skills or all at once

## Integration with Skill Ingestion

**Recommended workflow:**
1. User provides GitHub URL for new skill
2. **Run SkillSecurityAudit first** (this skill)
3. Review the report
4. Only if CLEAN or LOW risk, proceed with ingestion
5. For MEDIUM+, require explicit user acknowledgment

## Related Skills

| Skill | Relationship |
|-------|--------------|
| **DamageControl** | Provides runtime protection after ingestion |
| **CreateSkill** | Called after audit passes for skill creation |
| **Recon** | Shares security analysis patterns |

## Attribution

Inspired by supply chain security best practices and OWASP guidelines for third-party code review.
