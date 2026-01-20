# GeneratePrompt Workflow

> **Trigger:** "generate prompt", "image prompt", "Midjourney prompt", "Stable Diffusion prompt"
> **Input:** User description of desired image
> **Output:** Optimized prompt for text-to-image model

## Step 1: Parse Intent

Extract from user request:
- **Subject**: gender, ethnicity, age
- **Visual Style**: anime, realistic, watercolor, etc.
- **Scene Atmosphere**: cyberpunk, ancient, fantasy, etc.

## Step 2: Apply Commonsense Reasoning

Validate combinations:
- East Asian → black/brown eyes (not green/blue)
- "Anime style" affects rendering, not ethnicity
- "Cyberpunk" is atmosphere, not character attribute

## Step 3: Build Complete Intent

Fill defaults for missing elements:
- Gender: female (default)
- Ethnicity: East_Asian (for Chinese context)
- Lighting: natural (default)
- Makeup: natural (default)

## Step 4: Check Consistency

Detect and correct conflicts:
- Ethnicity vs eye/hair color mismatches
- Style vs attribute confusion
- Duplicate elements

## Step 5: Generate Final Prompt

Output format:
```
Theme: [Description]

Intent Analysis:
- Subject: [Gender], [ethnicity], [age]
- Style: [Art style]
- Atmosphere: [Scene atmosphere]

Generated Prompt:
────────────────────────────────────────
[Complete prompt text]
────────────────────────────────────────
```

## Completion

Prompt generated and ready for copy/paste to image generation tool.

## Skills Invoked

| Step | Skill |
|------|-------|
| None | Self-contained prompt generation |
