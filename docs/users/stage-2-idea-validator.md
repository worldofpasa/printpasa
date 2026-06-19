# Stage 2: Idea Validator

**Idea Validator** assesses your shortlisted themes for commercial viability and intellectual property risk, then selects **winners** that proceed to image prompt generation.

## Goal

Confirm which themes are safe to produce and worth designing, producing a set of **winner themes** for Stage 3.

## Before You Start

- Complete Stage 1 with at least one saved, selected theme.
- Optional: enable trademark, brand risk, or Etsy marketplace APIs in **Settings → Defaults** for stronger validation.

## Step-by-Step

### 1. Review shortlisted themes

Themes you selected in Stage 1 appear as validation candidates. Each card shows the title, description, and demographic context.

### 2. Configure winner count

Set how many winners the AI should pick (default from Settings, typically 5). This caps how many themes move forward—choose based on how many designs you want to produce.

### 3. Run validation

Click **Run validation**. PrintPasa evaluates each theme for:

- **IP / trademark risk** — Potential conflicts with brands, characters, or protected terms
- **Commercial viability** — Audience fit, trend strength, and sellability
- **Marketplace saturation** (if Etsy API configured) — Competition level for similar listings

Validation may take a minute when external APIs are enabled.

### 4. Review results

After the run, themes are sorted with scores and flags. Look for:

- Rejection reasons (trademark hit, low viability, saturated niche)
- API-checked badges when live trademark or brand APIs ran
- Etsy saturation labels: Low, Moderate, Saturated, or No listings found

### 5. Select winners

Toggle **winner** selection on themes you want to proceed. You can override AI recommendations—pick fewer or different winners if you disagree.

You must select at least one winner manually if the automatic selection does not match your intent.

### 6. Save winners

Click **Save winners** to lock your selection. The stage requires saved winners before advancement.

### 7. Continue

Click **Continue to Image Prompts** when ready.

## Validation Modes

| Mode | Behavior |
|------|----------|
| LLM only | AI assesses risk and viability from training knowledge |
| + Trademark API | Live USPTO-style trademark checks (requires RapidAPI key) |
| + Brand risk API | Web search for brand conflicts (requires SerpAPI key) |
| + Etsy marketplace | Listing count and saturation per theme (requires SearchAPI or SerpAPI) |

Without external APIs, validation still runs but relies on the LLM. Enable APIs for production workflows where IP risk matters.

## Advancement Requirements

| Requirement | Detail |
|-------------|--------|
| Saved winners | At least one theme marked as winner and saved |

## Tips

- Re-run validation after changing your Stage 1 shortlist—it does not delete themes, but winner flags may need updating.
- Themes rejected for IP reasons should not be forced through without legal review.
- Low Etsy saturation with strong trend signals often indicates opportunity; high saturation may require stronger differentiation.

## Related Guides

- [Stage 1: Gather Idea](./stage-1-gather-idea.md)
- [Stage 3: Image Prompts](./stage-3-image-prompts.md) — **Destructive regeneration warning**
- [Settings → Validation API toggles](./settings.md#validation-api-toggles)
