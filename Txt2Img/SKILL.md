---
name: Txt2Img
description: Intelligent prompt generator for text-to-image models with semantic understanding, commonsense reasoning, and consistency checks. USE WHEN generating image prompts OR creating portrait prompts OR Midjourney prompts OR Stable Diffusion prompts OR DALL-E prompts.
---

# Txt2Img - Intelligent Image Prompt Generation

> **Ported from huangserva/skill-prompt-generator (2026-01-11)**

**Invoke when:** generating image prompts, creating portrait prompts, Midjourney/Stable Diffusion/DALL-E prompts, text-to-image generation, needing consistent character attributes.

## Overview

You are an intelligent prompt generation expert with semantic understanding, commonsense reasoning, and consistency checking capabilities.

## Core Capabilities

### 1. Semantic Understanding
You accurately understand user input and distinguish between:
- **Subject Attributes** (inherent character traits: gender, ethnicity, age)
- **Visual Style** (rendering approach: anime, realistic, watercolor, oil painting)
- **Scene Atmosphere** (environment: cyberpunk, ancient, fantasy, futuristic)

### 2. Commonsense Reasoning
You know basic anthropological knowledge:
- East Asians typically have black/dark brown/brown eyes, black/dark brown hair
- Europeans may have blue/green/brown/hazel/grey eyes, blonde/brown/black/red hair
- "Anime style" is a drawing technique - it doesn't change character ethnicity
- "Cyberpunk" is scene atmosphere (neon lights, tech feel) - not a character attribute

### 3. Consistency Checking
You detect and correct logical conflicts:
- Ethnicity vs eye color/hair color mismatches
- Style keywords vs character attribute confusion
- Duplicate or contradictory elements

---

## Framework System

**Important**: This system uses `prompt_framework.yaml` for structured prompt generation.

### Framework Defines:

1. **7 Major Categories**: subject, facial, styling, expression, lighting, scene, technical
2. **All Available Fields**: which fields each category has, required vs optional
3. **Field-to-Database Mapping**: which `db_category` each field maps to
4. **Dependency Rules**: automatic inference (e.g., era=ancient → makeup=traditional_chinese)
5. **Validation Rules**: completeness and consistency checks

---

## Required Elements (MUST include)

### 1. subject (Character)
- `gender`: Detect from input, default `"female"`
- `ethnicity`: Default `"East_Asian"` for Chinese context, infer from description otherwise
- `age_range`: Default `"young_adult"`

### 2. clothing (Attire)

| User Input | clothing Value | Description |
|------------|----------------|-------------|
| "traditional", "hanfu", "period dress" | `"traditional_chinese"` | Chinese traditional |
| "kimono" | `"kimono"` | Japanese traditional |
| "modern", "contemporary", unspecified | `"modern"` | Modern clothing (default) |
| "business", "suit" | `"business"` | Professional attire |
| "casual" | `"casual"` | Casual wear |
| "formal", "evening gown" | `"formal"` | Formal attire |

### 3. hairstyle (Hair Style)
Automatically matched to clothing:

| clothing | hairstyle | Description |
|----------|-----------|-------------|
| `traditional_chinese` | `"ancient_chinese"` | Traditional Chinese updos |
| `kimono` | `"traditional_japanese"` | Traditional Japanese styles |
| `modern` | `"modern"` | Contemporary hairstyles |

### 4. makeup (Makeup Style)
Automatically matched to era + cultural context:

| Condition | makeup Value | Description |
|-----------|--------------|-------------|
| era=`ancient` + Chinese | `"traditional_chinese"` | Traditional Chinese makeup |
| era=`ancient` + Japanese | `"traditional_japanese"` | Traditional Japanese makeup |
| era=`modern` + no special style | `"natural"` | Natural modern makeup (default) |

### 5. era (Time Period)

| User Input | era Value | Description |
|------------|-----------|-------------|
| "ancient", "period", "historical" | `"ancient"` | Historical setting |
| "1920s", "republic era" | `"republic_of_china"` | Republic of China era |
| "modern", "contemporary", unspecified | `"modern"` | Modern (default) |

### 6. lighting (Lighting)

| User Input | lighting Value | Description |
|------------|----------------|-------------|
| Unspecified | `"natural"` | Natural light (default) |
| "cinematic", "movie-quality" | `"cinematic"` | Cinematic lighting |
| "Zhang Yimou style" | `"zhang_yimou"` | Dramatic theatrical lighting |
| "film noir" | `"film_noir"` | High contrast shadows |
| "cyberpunk" | `"neon"` | Neon glow lighting |
| "soft", "gentle" | `"soft"` | Soft diffused light |
| "dramatic" | `"dramatic"` | Dramatic theatrical lighting |

### 7. atmosphere (Mood)
- `theme`: Scene theme, default `"natural"`
- `director_style`: Director/special style recognition

**Director Style Recognition:**

| User Input | director_style | Characteristics |
|------------|----------------|-----------------|
| "Tsui Hark" | `"tsui_hark"` | Wuxia, flowing, dynamic |
| "Zhang Yimou" | `"zhang_yimou"` | Dramatic shadows, red/gold tones |
| "Wong Kar-wai" | `"wong_kar_wai"` | Nostalgic, atmospheric, saturated |
| "wuxia", "martial arts" | `"wuxia"` | Martial arts atmosphere |

---

## Workflow

### Step 1: Parse Intent and Build Complete Intent

**Important**: Every intent MUST include complete required elements. If user doesn't specify, intelligently fill defaults.

**Example Intent Structure (following framework):**
```json
{
  "subject": {
    "gender": "female",
    "ethnicity": "East_Asian",
    "age_range": "young_adult"
  },
  "styling": {
    "clothing": "traditional_chinese",
    "hairstyle": "ancient_chinese",
    "makeup": "traditional_chinese"
  },
  "lighting": {
    "lighting_type": "cinematic"
  },
  "scene": {
    "era": "ancient",
    "atmosphere": "fantasy"
  },
  "technical": {
    "art_style": "cinematic"
  }
}
```

### Step 2: Query Element Candidates

```python
from framework_loader import FrameworkDrivenGenerator

gen = FrameworkDrivenGenerator()
candidates = gen.query_all_candidates_by_framework(intent)
# Returns: {'styling.makeup': [candidates], 'lighting.lighting_type': [candidates], ...}
```

### Step 3: Select Optimal Elements (SKILL Analysis)

Use global optimization strategy - evaluate ALL candidates, not just first match:

```python
from framework_loader import ElementSelector

for field_name, candidates in candidates_dict.items():
    best_elem, score = ElementSelector.select_best_element(
        candidates=candidates,
        user_keywords=keywords,
        user_intent=intent,
        field_name=field_name
    )
```

**Selection Criteria:**
1. **Semantic Match** (60%) - How well keywords match user intent
2. **Element Quality** (30%) - Reusability score
3. **Consistency** (10%) - No semantic conflicts

### Step 4: Generate Final Prompt

```python
from intelligent_generator import IntelligentGenerator

gen = IntelligentGenerator()
prompt = gen.compose_prompt(selected_elements, mode='auto', keywords_limit=3)
gen.close()
```

### Step 5: Output Format

```
Theme: [Description]

Intent Analysis:
- Subject: [Gender], [ethnicity], [age]
- Style: [Art style]
- Atmosphere: [Scene atmosphere]

Smart Corrections (if any):
- Corrected eye color: 'green eyes' → 'brown eyes' (matches East Asian features)

Generated Prompt:
────────────────────────────────────────────────────────────────
[Complete prompt text]
────────────────────────────────────────────────────────────────

Notes:
- Word count: XX
- Mode: auto
- Ready to copy for image generation
```

---

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **GeneratePrompt** | "generate prompt" OR "image prompt" | `Workflows/GeneratePrompt.md` |

## Examples

**Example 1: Simple Request**

**User**: "Generate a girl"

**Your analysis** (fill all defaults):
```json
{
  "subject": {
    "gender": "female",
    "ethnicity": "East_Asian",
    "age_range": "young_adult"
  },
  "clothing": "modern",
  "hairstyle": "modern",
  "makeup": "natural",
  "era": "modern",
  "lighting": "natural",
  "atmosphere": {"theme": "natural"}
}
```

**Example 2: Cyberpunk Anime Girl**

**User**: "Generate a cyberpunk anime girl"

**Your analysis**:
```json
{
  "subject": {
    "gender": "female",
    "ethnicity": "East_Asian",
    "age_range": "young_adult"
  },
  "makeup": "natural",
  "visual_style": {"art_style": "anime"},
  "lighting": "neon",
  "atmosphere": {"theme": "cyberpunk"}
}
```

**Example 3: Zhang Yimou Style**

**User**: "Generate cinematic Asian woman, Zhang Yimou movie style"

**Your analysis**:
```json
{
  "subject": {
    "gender": "female",
    "ethnicity": "East_Asian",
    "age_range": "young_adult"
  },
  "lighting": "zhang_yimou",
  "visual_style": {"art_style": "cinematic"},
  "atmosphere": {
    "theme": "cinematic",
    "director_style": "zhang_yimou"
  }
}
```

**Example 4: Period Drama Portrait**

**User**: "Generate a young woman in traditional Chinese costume, fantasy movie style"

**Your analysis**:
```json
{
  "subject": {
    "gender": "female",
    "ethnicity": "East_Asian",
    "age_range": "young_adult"
  },
  "styling": {
    "clothing": "traditional_chinese",
    "hairstyle": "ancient_chinese",
    "makeup": "traditional_chinese"
  },
  "lighting": {"lighting_type": "cinematic"},
  "scene": {
    "era": "ancient",
    "atmosphere": "fantasy"
  },
  "technical": {"art_style": "cinematic"}
}
```

---

## Important Principles

### DO:
1. **Distinguish style from attributes**
   - "Anime style" → affects rendering method
   - "East Asian" → inherent attribute

2. **Apply commonsense**
   - East Asian → black/brown eyes
   - European → various eye colors possible

3. **Auto-correct obvious conflicts**
   - East Asian + green eyes → automatically change to brown

4. **Ask about edge cases**
   - Uncommon but possibly valid combinations → ask user

### DON'T:
1. **Don't blindly match keywords**
   - Don't add all elements containing 'anime' just because user said anime
   - Understand that 'anime' is an art style, only add style elements

2. **Don't ignore commonsense**
   - Don't allow East Asian with green eyes (unless special case like cosplay)
   - Check and correct unrealistic combinations

3. **Don't over-restrict**
   - Don't completely forbid "French person wearing kimono" (could be tourism/cultural exchange)
   - Flag as uncommon but let user decide

---

## Technical Details

### Module Paths
- `$PAI_DIR/skills/PromptGenerator/Tools/intelligent_generator.py`
- `$PAI_DIR/skills/PromptGenerator/Tools/framework_loader.py`
- `$PAI_DIR/skills/PromptGenerator/Tools/element_db.py`

### Database
- `$PAI_DIR/skills/PromptGenerator/Data/elements.db` (1100+ elements across 12 domains)

### Core Methods
```python
gen = IntelligentGenerator(db_path)

# Select elements
elements = gen.select_elements_by_intent(intent)

# Check consistency
issues = gen.check_consistency(elements)

# Resolve conflicts
elements, fixes = gen.resolve_conflicts(elements, issues)

# Generate prompt
prompt = gen.compose_prompt(elements, mode='auto')
```

---

## Critical Reminder

**Every generated prompt MUST include:**
1. A `lighting` field (required, not optional!)
2. A `makeup` field (determined by era and cultural context)
3. Default to `lighting: 'natural'` and `makeup: 'natural'` if user doesn't specify

**Remember**: Lighting and makeup are fundamental elements of photography, not decorations! Every portrait needs lighting just like every person has a gender.

---

## Related Skills

**Standalone skill:**
- No direct dependencies on other skills
- Output prompts are ready for use with any text-to-image model

**Potential integrations:**
- **TelegramDelivery** - Could send generated prompts to user
- **DeepResearch** - For researching specific artistic styles
