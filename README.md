# Skills

A collection of Claude Code skills for enhanced AI-assisted development workflows.

## What are Skills?

Skills are modular capability packages that extend Claude Code with specialized workflows, tools, and domain knowledge. Each skill contains:

- **SKILL.md** - Skill definition and routing triggers
- **Workflows/** - Step-by-step execution guides
- **Tools/** - TypeScript/Python CLI tools
- **Data/** - Configuration and reference data

## Skill Categories

### Core & Meta
| Skill | Description |
|-------|-------------|
| **CORE** | System architecture, contacts, telos, state sync |
| **UsingSkills** | How to invoke and chain skills |
| **UsingWorkflows** | Check and invoke relevant workflow skills |
| **CreateSkill** | Skill authoring and validation |
| **ContextEngineering** | Context window optimization |

### Planning & Execution
| Skill | Description |
|-------|-------------|
| **WritingPlans** | Structured plan creation |
| **ExecutingPlans** | Plan execution with checkpoints |
| **Brainstorming** | Design exploration workflows |

### Development
| Skill | Description |
|-------|-------------|
| **TestDrivenDevelopment** | Red-green-refactor workflow |
| **SubagentDrivenDevelopment** | Multi-agent implementation |
| **SystematicDebugging** | Root cause analysis |
| **FinishingBranch** | Branch completion checklist |
| **UsingGitWorktrees** | Parallel branch development |
| **ReactUseEffect** | React useEffect best practices |

### Code Review
| Skill | Description |
|-------|-------------|
| **Review** | Multi-agent code review with parallel analysis |
| **RequestingCodeReview** | PR preparation and review requests |
| **ReceivingCodeReview** | Feedback evaluation and response |
| **AskDaniel** | Expert review simulation |

### Research & Reasoning
| Skill | Description |
|-------|-------------|
| **DeepResearch** | Parallel research aggregation |
| **ThoughtBasedReasoning** | Reasoning strategy selection |

### Agents & Automation
| Skill | Description |
|-------|-------------|
| **DispatchingParallelAgents** | Concurrent agent orchestration |
| **AgentEvaluation** | Agent performance assessment |
| **DamageControl** | Safety patterns for destructive operations |

### Prompting
| Skill | Description |
|-------|-------------|
| **Prompting** | Best practices and templates |
| **PromptCompiler** | Vague input to structured prompt transformation |

### Media & Content
| Skill | Description |
|-------|-------------|
| **Pdf** | PDF form filling and manipulation |
| **NotebookLM** | Google NotebookLM integration |
| **YouTubeDigest** | Channel monitoring and video summarization |
| **VoiceInterface** | Speech-to-text and text-to-speech |
| **Txt2Img** | Intelligent image prompt generation |

### Crypto/Web3
| Skill | Description |
|-------|-------------|
| **Ethereum** | ENS resolution, balance checks, contract reads |
| **Nansen** | Smart money analysis, wallet research |

### Utilities
| Skill | Description |
|-------|-------------|
| **TelegramDelivery** | Message delivery via Telegram |
| **DailyReview** | Daily summary generation |
| **SkillUsageAnalytics** | Usage tracking and reporting |
| **VerificationBeforeCompletion** | Pre-completion verification gates |
| **Compound** | Capture solved problems as categorized documentation |
| **Trivial** | Simple task handling |

## Configuration Files

| File | Purpose |
|------|---------|
| `routing-rules.json` | Keyword-to-skill routing |
| `skill-index.json` | Skill metadata and discovery |
| `skill-rules.json` | Execution rules and constraints |

## Usage

Skills are invoked automatically based on routing rules or explicitly:

```
# Automatic routing (keyword triggers)
"review this PR" → RequestingCodeReview

# Explicit invocation
/skill TestDrivenDevelopment
```

## Adding New Skills

Use the CreateSkill workflow:

```
/skill CreateSkill
```

Or manually create a skill directory with:
1. `SKILL.md` with frontmatter (name, description, triggers)
2. `Workflows/` with markdown workflow guides
3. `Tools/` with CLI implementations (optional)

## License

See individual skill directories for licensing information.
