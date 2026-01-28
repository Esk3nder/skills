#!/usr/bin/env bun
/**
 * AuditSkill.ts - Security audit tool for external skills
 *
 * Analyzes GitHub repositories for security risks before PAI ingestion.
 * Supports multi-skill repositories with skill discovery and selection.
 *
 * Usage:
 *   bun run AuditSkill.ts https://github.com/user/repo          # List skills in repo
 *   bun run AuditSkill.ts https://github.com/user/repo --all    # Audit all skills
 *   bun run AuditSkill.ts https://github.com/user/repo --skill "SkillName"  # Audit one
 *   bun run AuditSkill.ts --quick https://github.com/user/repo  # Quick scan
 *   bun run AuditSkill.ts --json https://github.com/user/repo   # JSON output
 */

import { existsSync, mkdtempSync, rmSync, readdirSync, readFileSync, statSync } from "fs";
import { join, basename, extname, dirname } from "path";
import { tmpdir } from "os";
import { $ } from "bun";

// Types
interface Finding {
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  category: string;
  pattern: string;
  file: string;
  line: number;
  context: string;
}

interface SkillInfo {
  name: string;
  path: string;
  description?: string;
  hasTools: boolean;
  hasWorkflows: boolean;
  fileCount: number;
}

interface SkillAuditResult {
  skillName: string;
  skillPath: string;
  riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "CLEAN";
  riskScore: number;
  filesAnalyzed: number;
  findings: Finding[];
  recommendation: string;
}

interface RepoAuditResult {
  repoUrl: string;
  repoName: string;
  isMultiSkillRepo: boolean;
  skillsFound: number;
  skills: SkillAuditResult[];
  overallRiskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "CLEAN";
  timestamp: string;
}

// Security patterns
const PATTERNS = {
  CRITICAL: [
    { regex: /curl\s+[^|]*\|\s*(ba)?sh/gi, category: "Command Injection", desc: "Piped curl to shell" },
    { regex: /wget\s+[^|]*\|\s*(ba)?sh/gi, category: "Command Injection", desc: "Piped wget to shell" },
    { regex: /eval\s*\(/gi, category: "Code Injection", desc: "eval() execution" },
    { regex: /rm\s+-rf\s+[\/~]/gi, category: "Destructive Command", desc: "Recursive delete from root/home" },
    { regex: /rm\s+-rf\s+\$\{?[A-Z_]+\}?/gi, category: "Destructive Command", desc: "Recursive delete with variable" },
    { regex: /cat\s+~?\/?\.ssh\//gi, category: "Credential Theft", desc: "Reading SSH keys" },
    { regex: /cat\s+~?\/?\.aws\//gi, category: "Credential Theft", desc: "Reading AWS credentials" },
    { regex: /git\s+push\s+.*--force/gi, category: "Destructive Command", desc: "Force push" },
    { regex: /\$\(.*curl.*\)/gi, category: "Command Injection", desc: "Command substitution with curl" },
    { regex: /`.*curl.*`/gi, category: "Command Injection", desc: "Backtick curl execution" },
  ],
  HIGH: [
    { regex: /child_process/gi, category: "Process Spawning", desc: "child_process module" },
    { regex: /execSync\s*\(/gi, category: "Process Spawning", desc: "Synchronous exec" },
    { regex: /spawn\s*\(/gi, category: "Process Spawning", desc: "Process spawn" },
    { regex: /(?:child_process|cp|require\s*\(\s*['"]child_process['"]\s*\))\.exec\s*\(/gi, category: "Process Spawning", desc: "child_process.exec() call" },
    { regex: /Bun\.spawn/gi, category: "Process Spawning", desc: "Bun.spawn" },
    { regex: /Deno\.run/gi, category: "Process Spawning", desc: "Deno.run" },
    { regex: /readFileSync\s*\([^)]*\.ssh/gi, category: "Credential Access", desc: "Reading SSH directory" },
    { regex: /readFileSync\s*\([^)]*\.aws/gi, category: "Credential Access", desc: "Reading AWS directory" },
    { regex: /readFileSync\s*\([^)]*\.env\b/gi, category: "Secrets Access", desc: "Reading .env file" },
    { regex: /writeFileSync\s*\([^)]*\.(bashrc|zshrc|profile)/gi, category: "Persistence", desc: "Modifying shell config" },
    { regex: /fetch\s*\([^)]+\).*readFileSync/gis, category: "Data Exfiltration", desc: "Sending file contents" },
    { regex: /crontab/gi, category: "Persistence", desc: "Cron manipulation" },
    { regex: /-----BEGIN.*PRIVATE KEY-----/gi, category: "Secrets Exposure", desc: "Embedded private key" },
    { regex: /AKIA[A-Z0-9]{16}/g, category: "Secrets Exposure", desc: "AWS Access Key ID" },
    { regex: /ghp_[a-zA-Z0-9]{36}/g, category: "Secrets Exposure", desc: "GitHub Personal Access Token" },
    { regex: /sk-[a-zA-Z0-9]{48}/g, category: "Secrets Exposure", desc: "OpenAI API Key" },
  ],
  MEDIUM: [
    { regex: /process\.env\./gi, category: "Environment Access", desc: "Environment variable access" },
    { regex: /fetch\s*\(/gi, category: "Network Activity", desc: "HTTP fetch" },
    { regex: /axios/gi, category: "Network Activity", desc: "Axios HTTP client" },
    { regex: /WebSocket/gi, category: "Network Activity", desc: "WebSocket connection" },
    { regex: /new\s+Function\s*\(/gi, category: "Dynamic Code", desc: "Dynamic function creation" },
    { regex: /Buffer\.from\s*\([^)]+,\s*['"]base64['"]\)/gi, category: "Encoding", desc: "Base64 decoding" },
    { regex: /btoa\s*\(/gi, category: "Encoding", desc: "Base64 encoding" },
    { regex: /atob\s*\(/gi, category: "Encoding", desc: "Base64 decoding" },
    { regex: /~?\/?\.claude\//gi, category: "PAI Access", desc: "PAI directory access" },
    { regex: /\.gnupg/gi, category: "Sensitive Path", desc: "GPG directory access" },
    { regex: /\.config\/gh/gi, category: "Sensitive Path", desc: "GitHub CLI config access" },
  ],
  LOW: [
    { regex: /console\.(log|error|warn)/gi, category: "Logging", desc: "Console output" },
    { regex: /JSON\.parse/gi, category: "Data Parsing", desc: "JSON parsing" },
    { regex: /fs\.(read|write)/gi, category: "File System", desc: "File system operations" },
  ],
};

// Severity scores
const SEVERITY_SCORES: Record<string, number> = {
  CRITICAL: 100,
  HIGH: 25,
  MEDIUM: 5,
  LOW: 1,
};

// Files to analyze
const ANALYZABLE_EXTENSIONS = [".md", ".ts", ".js", ".tsx", ".jsx", ".sh", ".yaml", ".yml", ".json", ".mjs", ".cjs"];

// Parse CLI arguments
interface ParsedArgs {
  url: string;
  quick: boolean;
  json: boolean;
  all: boolean;
  skill: string | null;
  list: boolean;
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  let url = "";
  let quick = false;
  let json = false;
  let all = false;
  let skill: string | null = null;
  let list = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--quick" || arg === "-q") quick = true;
    else if (arg === "--json" || arg === "-j") json = true;
    else if (arg === "--all" || arg === "-a") all = true;
    else if (arg === "--list" || arg === "-l") list = true;
    else if (arg === "--skill" || arg === "-s") {
      skill = args[++i] || null;
    }
    else if (arg.startsWith("http") || arg.startsWith("gh:")) url = arg;
  }

  return { url, quick, json, all, skill, list };
}

// Parse GitHub URL
function parseGitHubUrl(input: string): { owner: string; repo: string } | null {
  if (input.startsWith("gh:")) {
    const parts = input.slice(3).split("/");
    if (parts.length >= 2) {
      return { owner: parts[0], repo: parts[1] };
    }
  }

  const match = input.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
  if (match) {
    return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
  }

  return null;
}

// Clone repository using git directly (no gh CLI dependency)
async function cloneRepo(owner: string, repo: string): Promise<string | null> {
  const tempDir = mkdtempSync(join(tmpdir(), "skill-audit-"));
  const repoUrl = `https://github.com/${owner}/${repo}.git`;

  try {
    await $`git clone --depth 1 --single-branch ${repoUrl} ${tempDir}`.quiet();
    return tempDir;
  } catch (error) {
    console.error(`Failed to clone ${owner}/${repo}`);
    console.error("Make sure the repository exists and is public.");
    rmSync(tempDir, { recursive: true, force: true });
    return null;
  }
}

// Find all SKILL.md files in the repo
function findSkillFiles(dir: string): string[] {
  const skillFiles: string[] = [];

  function searchDir(currentDir: string) {
    try {
      const entries = readdirSync(currentDir);

      for (const entry of entries) {
        if (entry.startsWith(".") || entry === "node_modules" || entry === "dist") continue;

        const fullPath = join(currentDir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          searchDir(fullPath);
        } else if (entry === "SKILL.md") {
          skillFiles.push(fullPath);
        }
      }
    } catch (e) {
      // Ignore permission errors
    }
  }

  searchDir(dir);
  return skillFiles;
}

// Parse SKILL.md to extract skill info
function parseSkillMd(skillMdPath: string, baseDir: string): SkillInfo {
  const content = readFileSync(skillMdPath, "utf-8");
  const skillDir = dirname(skillMdPath);
  const relativePath = skillDir.replace(baseDir + "/", "");

  // Extract name from YAML frontmatter
  let name = basename(skillDir);
  const nameMatch = content.match(/^---[\s\S]*?name:\s*(.+?)[\s\r\n]/m);
  if (nameMatch) {
    name = nameMatch[1].trim();
  }

  // Extract description
  let description: string | undefined;
  const descMatch = content.match(/^---[\s\S]*?description:\s*(.+?)[\s\r\n]/m);
  if (descMatch) {
    description = descMatch[1].trim().slice(0, 100);
  }

  // Check for Tools and Workflows directories
  const hasTools = existsSync(join(skillDir, "Tools"));
  const hasWorkflows = existsSync(join(skillDir, "Workflows"));

  // Count files in skill directory
  const fileCount = getAnalyzableFiles(skillDir).length;

  return {
    name,
    path: relativePath,
    description,
    hasTools,
    hasWorkflows,
    fileCount,
  };
}

// Get all analyzable files recursively
function getAnalyzableFiles(dir: string, files: string[] = []): string[] {
  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);

      if (entry.startsWith(".") || entry === "node_modules" || entry === "dist") continue;

      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        getAnalyzableFiles(fullPath, files);
      } else if (ANALYZABLE_EXTENSIONS.includes(extname(entry).toLowerCase())) {
        files.push(fullPath);
      }
    }
  } catch (e) {
    // Ignore permission errors
  }

  return files;
}

// Analyze a single file
function analyzeFile(filePath: string, baseDir: string, quick: boolean): Finding[] {
  const findings: Finding[] = [];

  try {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    const relativePath = filePath.replace(baseDir + "/", "");

    const severities = quick ? ["CRITICAL", "HIGH"] : ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

    for (const severity of severities) {
      const patterns = PATTERNS[severity as keyof typeof PATTERNS];

      for (const { regex, category, desc } of patterns) {
        regex.lastIndex = 0;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          regex.lastIndex = 0;

          if (regex.test(line)) {
            findings.push({
              severity: severity as Finding["severity"],
              category,
              pattern: desc,
              file: relativePath,
              line: i + 1,
              context: line.trim().slice(0, 100),
            });
          }
        }
      }
    }
  } catch (e) {
    // Skip files that can't be read
  }

  return findings;
}

// Calculate risk level from score
function calculateRiskLevel(score: number): SkillAuditResult["riskLevel"] {
  if (score >= 100) return "CRITICAL";
  if (score >= 50) return "HIGH";
  if (score >= 20) return "MEDIUM";
  if (score >= 1) return "LOW";
  return "CLEAN";
}

// Generate recommendation
function generateRecommendation(riskLevel: SkillAuditResult["riskLevel"]): string {
  switch (riskLevel) {
    case "CRITICAL":
      return "DO NOT INGEST - Active malware indicators detected.";
    case "HIGH":
      return "MANUAL REVIEW REQUIRED - Dangerous patterns detected.";
    case "MEDIUM":
      return "REVIEW BEFORE INGESTING - Suspicious patterns found.";
    case "LOW":
      return "SAFE WITH AWARENESS - Minor concerns noted.";
    case "CLEAN":
      return "SAFE TO INGEST - No security concerns detected.";
  }
}

// Audit a single skill directory
function auditSkill(skillDir: string, skillName: string, baseDir: string, quick: boolean): SkillAuditResult {
  const files = getAnalyzableFiles(skillDir);
  const allFindings: Finding[] = [];

  for (const file of files) {
    const findings = analyzeFile(file, baseDir, quick);
    allFindings.push(...findings);
  }

  const riskScore = allFindings.reduce((sum, f) => sum + SEVERITY_SCORES[f.severity], 0);
  const riskLevel = calculateRiskLevel(riskScore);

  return {
    skillName,
    skillPath: skillDir.replace(baseDir + "/", ""),
    riskLevel,
    riskScore,
    filesAnalyzed: files.length,
    findings: allFindings,
    recommendation: generateRecommendation(riskLevel),
  };
}

// Format skill list
function formatSkillList(skills: SkillInfo[], repoName: string): string {
  const lines: string[] = [];

  lines.push(`\n📦 Repository: ${repoName}`);
  lines.push(`   Found ${skills.length} skill(s):\n`);

  for (let i = 0; i < skills.length; i++) {
    const s = skills[i];
    const tools = s.hasTools ? "✓ Tools" : "✗ Tools";
    const workflows = s.hasWorkflows ? "✓ Workflows" : "✗ Workflows";

    lines.push(`   ${i + 1}. ${s.name}`);
    lines.push(`      Path: ${s.path}`);
    if (s.description) {
      lines.push(`      Desc: ${s.description}...`);
    }
    lines.push(`      ${tools} | ${workflows} | ${s.fileCount} files`);
    lines.push("");
  }

  lines.push("To audit:");
  lines.push(`  --all           Audit all skills`);
  lines.push(`  --skill "Name"  Audit specific skill`);

  return lines.join("\n");
}

// Format full report
function formatReport(result: RepoAuditResult): string {
  const lines: string[] = [];

  lines.push(`# Security Audit Report: ${result.repoName}`);
  lines.push("");
  lines.push(`**Audit Date:** ${result.timestamp}`);
  lines.push(`**Auditor:** SkillSecurityAudit v2.0`);
  lines.push("");

  // Overall summary
  const overallBadge = {
    CRITICAL: "🔴 CRITICAL",
    HIGH: "🟠 HIGH",
    MEDIUM: "🟡 MEDIUM",
    LOW: "🟢 LOW",
    CLEAN: "✅ CLEAN",
  }[result.overallRiskLevel];

  lines.push("## Summary");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|--------|-------|");
  lines.push(`| Repository | ${result.repoUrl} |`);
  lines.push(`| Skills Found | ${result.skillsFound} |`);
  lines.push(`| Skills Audited | ${result.skills.length} |`);
  lines.push(`| Overall Risk | ${overallBadge} |`);
  lines.push("");

  // Per-skill results
  if (result.skills.length > 0) {
    lines.push("## Skills Audited");
    lines.push("");
    lines.push("| Skill | Risk | Score | Files | Findings |");
    lines.push("|-------|------|-------|-------|----------|");

    for (const skill of result.skills) {
      const badge = {
        CRITICAL: "🔴",
        HIGH: "🟠",
        MEDIUM: "🟡",
        LOW: "🟢",
        CLEAN: "✅",
      }[skill.riskLevel];
      lines.push(`| ${skill.skillName} | ${badge} ${skill.riskLevel} | ${skill.riskScore} | ${skill.filesAnalyzed} | ${skill.findings.length} |`);
    }
    lines.push("");

    // Detailed findings per skill
    for (const skill of result.skills) {
      if (skill.findings.length === 0) continue;

      lines.push(`### ${skill.skillName} Findings`);
      lines.push("");

      // Group by severity
      const grouped = {
        CRITICAL: skill.findings.filter(f => f.severity === "CRITICAL"),
        HIGH: skill.findings.filter(f => f.severity === "HIGH"),
        MEDIUM: skill.findings.filter(f => f.severity === "MEDIUM"),
        LOW: skill.findings.filter(f => f.severity === "LOW"),
      };

      for (const [severity, findings] of Object.entries(grouped)) {
        if (findings.length === 0) continue;

        lines.push(`**${severity}:**`);
        for (const f of findings.slice(0, 10)) {  // Limit to 10 per severity
          lines.push(`- ${f.category}: ${f.pattern}`);
          lines.push(`  \`${f.file}:${f.line}\` - \`${f.context}\``);
        }
        if (findings.length > 10) {
          lines.push(`  ... and ${findings.length - 10} more`);
        }
        lines.push("");
      }
    }
  }

  // Recommendations
  lines.push("## Recommendations");
  lines.push("");

  const criticalSkills = result.skills.filter(s => s.riskLevel === "CRITICAL");
  const highSkills = result.skills.filter(s => s.riskLevel === "HIGH");
  const safeSkills = result.skills.filter(s => s.riskLevel === "CLEAN" || s.riskLevel === "LOW");

  if (criticalSkills.length > 0) {
    lines.push(`**🚫 DO NOT INGEST (${criticalSkills.length}):** ${criticalSkills.map(s => s.skillName).join(", ")}`);
  }
  if (highSkills.length > 0) {
    lines.push(`**⚠️ MANUAL REVIEW (${highSkills.length}):** ${highSkills.map(s => s.skillName).join(", ")}`);
  }
  if (safeSkills.length > 0) {
    lines.push(`**✅ SAFE TO INGEST (${safeSkills.length}):** ${safeSkills.map(s => s.skillName).join(", ")}`);
  }

  lines.push("");
  lines.push("---");
  lines.push("*Generated by SkillSecurityAudit v2.0*");

  return lines.join("\n");
}

// Main audit function
async function audit(): Promise<void> {
  const { url, quick, json, all, skill, list } = parseArgs();

  if (!url) {
    console.log("SkillSecurityAudit v2.0 - Security vetting for external skills\n");
    console.log("Usage: bun run AuditSkill.ts [options] <github-url>\n");
    console.log("Options:");
    console.log("  --list, -l        List skills in repository (default if no action specified)");
    console.log("  --all, -a         Audit all skills in repository");
    console.log("  --skill, -s NAME  Audit specific skill by name");
    console.log("  --quick, -q       Quick scan (critical/high only)");
    console.log("  --json, -j        Output as JSON");
    console.log("");
    console.log("Examples:");
    console.log("  bun run AuditSkill.ts https://github.com/czlonkowski/n8n-skills");
    console.log("  bun run AuditSkill.ts --all https://github.com/user/skill-repo");
    console.log('  bun run AuditSkill.ts --skill "n8n MCP Tools Expert" gh:czlonkowski/n8n-skills');
    process.exit(1);
  }

  const parsed = parseGitHubUrl(url);
  if (!parsed) {
    console.error("Invalid GitHub URL");
    process.exit(1);
  }

  const { owner, repo } = parsed;
  console.log(`\n🔍 Analyzing ${owner}/${repo}...\n`);

  // Clone repo
  const tempDir = await cloneRepo(owner, repo);
  if (!tempDir) {
    process.exit(1);
  }

  try {
    // Find all SKILL.md files
    const skillFiles = findSkillFiles(tempDir);
    const skillInfos = skillFiles.map(f => parseSkillMd(f, tempDir));

    console.log(`Found ${skillInfos.length} skill(s) in repository`);

    // If no skills found, maybe it's a single-skill repo at root
    if (skillInfos.length === 0) {
      // Check if root has skill-like structure
      const rootFiles = getAnalyzableFiles(tempDir);
      if (rootFiles.length > 0) {
        console.log("No SKILL.md found. Treating as single-skill repository.\n");

        // Audit entire repo as one skill
        const result = auditSkill(tempDir, repo, tempDir, quick);

        const repoResult: RepoAuditResult = {
          repoUrl: `https://github.com/${owner}/${repo}`,
          repoName: repo,
          isMultiSkillRepo: false,
          skillsFound: 1,
          skills: [result],
          overallRiskLevel: result.riskLevel,
          timestamp: new Date().toISOString(),
        };

        if (json) {
          console.log(JSON.stringify(repoResult, null, 2));
        } else {
          console.log(formatReport(repoResult));
        }

        if (result.riskLevel === "CRITICAL" || result.riskLevel === "HIGH") {
          process.exit(2);
        }
        return;
      }

      console.log("No analyzable files found.");
      process.exit(1);
    }

    // Default behavior: list skills
    if (!all && !skill) {
      console.log(formatSkillList(skillInfos, repo));
      return;
    }

    // Determine which skills to audit
    let skillsToAudit: SkillInfo[] = [];

    if (all) {
      skillsToAudit = skillInfos;
    } else if (skill) {
      const found = skillInfos.find(s =>
        s.name.toLowerCase() === skill.toLowerCase() ||
        s.path.toLowerCase().includes(skill.toLowerCase())
      );
      if (!found) {
        console.error(`Skill "${skill}" not found. Available skills:`);
        for (const s of skillInfos) {
          console.log(`  - ${s.name} (${s.path})`);
        }
        process.exit(1);
      }
      skillsToAudit = [found];
    }

    console.log(`Auditing ${skillsToAudit.length} skill(s)...\n`);

    // Audit each skill
    const auditResults: SkillAuditResult[] = [];

    for (const skillInfo of skillsToAudit) {
      const skillDir = join(tempDir, skillInfo.path);
      console.log(`  → Auditing: ${skillInfo.name}`);
      const result = auditSkill(skillDir, skillInfo.name, tempDir, quick);
      auditResults.push(result);

      // Print inline status
      const badge = {
        CRITICAL: "🔴",
        HIGH: "🟠",
        MEDIUM: "🟡",
        LOW: "🟢",
        CLEAN: "✅",
      }[result.riskLevel];
      console.log(`    ${badge} ${result.riskLevel} (${result.findings.length} findings)\n`);
    }

    // Calculate overall risk
    let overallRiskLevel: RepoAuditResult["overallRiskLevel"] = "CLEAN";
    for (const r of auditResults) {
      if (r.riskLevel === "CRITICAL") {
        overallRiskLevel = "CRITICAL";
        break;
      }
      if (r.riskLevel === "HIGH" && overallRiskLevel !== "CRITICAL") {
        overallRiskLevel = "HIGH";
      }
      if (r.riskLevel === "MEDIUM" && !["CRITICAL", "HIGH"].includes(overallRiskLevel)) {
        overallRiskLevel = "MEDIUM";
      }
      if (r.riskLevel === "LOW" && overallRiskLevel === "CLEAN") {
        overallRiskLevel = "LOW";
      }
    }

    const repoResult: RepoAuditResult = {
      repoUrl: `https://github.com/${owner}/${repo}`,
      repoName: repo,
      isMultiSkillRepo: skillInfos.length > 1,
      skillsFound: skillInfos.length,
      skills: auditResults,
      overallRiskLevel,
      timestamp: new Date().toISOString(),
    };

    // Output
    if (json) {
      console.log(JSON.stringify(repoResult, null, 2));
    } else {
      console.log(formatReport(repoResult));
    }

    // Exit code
    if (overallRiskLevel === "CRITICAL" || overallRiskLevel === "HIGH") {
      process.exit(2);
    }

  } finally {
    // Cleanup
    rmSync(tempDir, { recursive: true, force: true });
  }
}

// Run
audit().catch(console.error);
