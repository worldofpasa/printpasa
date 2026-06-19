# Stage 3: Image Prompts

**Image Prompts** turns winning themes into detailed, print-ready prompts for AI image generation in Stage 4.

## Goal

Create a set of **selected image prompts**—each describing style, composition, colors, and design lane (typography, illustration, etc.) for one potential design.

---

## ⚠️ Destructive Regeneration Warning

**Re-running prompt generation replaces all existing active prompts for your winner themes.**

When you click **Generate prompts**:

- All current **active** prompts for winner themes are marked **superseded** (hidden from the workflow)
- New prompts are created from scratch
- Previous prompt text is **not recoverable** through the UI

**Before regenerating:**

1. Copy any prompt text you want to keep externally
2. Confirm you are okay losing current prompt selections
3. Consider [forking the project](./workflows.md#forking-a-project) at Stage 2 or 3 if you want to explore alternatives without losing this branch

Stage 1 theme generation **appends** themes; Stage 3 **replaces** prompts. Stage 4 behaves similarly for images.

---

## Before You Start

- Complete Stage 2 with at least one saved winner.
- Configure your AI provider in **Settings → Defaults** (or a per-stage override for Image Prompts).

## Step-by-Step

### 1. Set prompts per theme

Choose how many prompts to generate per winning theme (default from Settings, typically 5, max 10).

### 2. Generate prompts

Click **Generate prompts**. The AI produces grouped prompts under each winner theme, including:

- Prompt text (detailed image description)
- Style tags
- Background color (hex and name)
- Design lane and slogan text where applicable

### 3. Review and edit

Expand each theme group. For any prompt:

- **Toggle selection** — Only selected prompts are used in Stage 4
- **Edit inline** — Adjust wording before image generation
- **Deselect weak prompts** — Reduce generation cost by selecting fewer prompts

Edits to individual prompts are saved without triggering full regeneration.

### 4. Continue

Select at least one prompt, then click **Continue to Image Generate**.

## Advancement Requirements

| Requirement | Detail |
|-------------|--------|
| Selected prompts | At least one prompt must be selected (`isSelected`) |

Saving is implicit when toggling selection—no separate Save button.

## Re-Running vs. Editing

| Action | Effect |
|--------|--------|
| Edit a single prompt | Updates that prompt only; safe |
| Toggle selection | Changes which prompts Stage 4 uses; safe |
| **Generate prompts** (full regen) | **Supersedes all active prompts** for winners; destructive |

## Tips

- Select fewer, stronger prompts to control Stage 4 cost and time.
- Align background colors with your planned product colors (dark shirts often need light/transparent backgrounds after Stage 5).
- If winners change in Stage 2, return here and regenerate—or edit selections manually if existing prompts still apply.

## Related Guides

- [Stage 4: Image Generate](./stage-4-image-generate.md) — **Destructive regeneration warning**
- [Workflows → Forking](./workflows.md#forking-a-project)
- [Troubleshooting → Failed generations](./troubleshooting.md#failed-ai-or-image-generations)
