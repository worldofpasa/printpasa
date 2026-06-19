# Stage 1: Gather Idea

**Gather Idea** is the first stage of the PrintPasa pipeline. You describe a product concept, optionally pull in trend signals, and generate a shortlist of design themes to validate in Stage 2.

## Goal

Produce a curated set of **selected themes** that represent strong directions for your t-shirt (or print) line.

## Before You Start

- Complete [Getting Started](./getting-started.md) and create a project.
- Configure at least one AI provider in **Settings → Defaults**.
- For richer research, add search API keys (Serper, SearchAPI, or SerpAPI) under **Settings → Defaults → Idea research search**.

## Step-by-Step

### 1. Describe your product idea

Enter a commercial brief in the **Product idea** field (minimum 10 characters). Include:

- Target audience
- Occasion, season, or trend angle
- Tone or visual mood
- Any constraints (no text, minimalist, etc.)

The project description from creation is pre-filled; edit it as needed.

### 2. Set theme count

Choose how many themes to generate (default from Settings, typically 10). Higher counts give more options but cost more AI usage.

### 3. Generate themes

Click **Generate themes**. PrintPasa will:

1. Plan research keywords from your idea
2. Fetch signals from configured sources (Reddit, Pinterest, TikTok, Google Trends, etc.)
3. Generate theme titles and descriptions using your AI provider

Progress messages appear during generation. When complete, theme cards are displayed.

### 4. Review research signals

If research ran, check the **Research sources** panel for each source’s status (success, partial, failed, or skipped). Warnings highlight sources that could not be reached—generation still proceeds with available data.

Open the project **Research** page (linked from the stage header) for a deeper view of captured signals.

### 5. Select themes

Click theme cards to add them to your shortlist. Selected themes are highlighted. Aim for quality over quantity—you will validate these in Stage 2.

### 6. Save your shortlist

Click **Save selection** to persist your picks. The stage is ready to advance only after saving with at least one theme selected.

### 7. Continue

Click **Continue to Idea Validator** when the footer shows **Ready to continue**.

## Re-Running Generation

Running **Generate themes** again **appends** new themes to the project. Previous themes are **not deleted**. You may accumulate many themes over multiple runs—deselect or ignore themes you no longer want before saving.

This is different from Stages 3 and 4, where regeneration replaces prior output.

## Advancement Requirements

| Requirement | Detail |
|-------------|--------|
| Saved selection | At least one theme must be selected and saved |
| Stage gate | Unsaved selections block advancement |

## Tips

- Write specific briefs (“funny dad jokes about grilling for Father’s Day”) rather than vague ones (“funny shirts”).
- If research sources fail, check search API keys in Settings.
- You can return to this stage later to generate additional themes without losing downstream work—as long as you do not change which themes are selected and saved in ways that invalidate later stages.

## Related Guides

- [Stage 2: Idea Validator](./stage-2-idea-validator.md)
- [Settings → Defaults](./settings.md#defaults)
- [Workflows → Re-run stages](./workflows.md#re-running-stages)
