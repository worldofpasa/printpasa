# Settings

PrintPasa stores workspace configuration under **Settings** in the main navigation. Changes apply to new projects and workflow runs unless a project overrides a specific provider. Always click **Save** (or press ⌘S / Ctrl+S) after editing—an amber dot on the Save button indicates unsaved changes.

Settings are organized into tabs. Use the URL query `?tab=` to link directly (e.g. `/settings?tab=providers`).

## Defaults

The **Defaults** tab controls your starting stack and workflow volumes.

### Default providers

These providers are used for new projects unless overridden per project or per stage:

| Setting | Used for |
|---------|----------|
| AI provider | Text generation (ideas, validation, prompts) |
| Image provider | Stage 4 image generation |
| Upscale provider | Stage 5 image upscaling |
| Background removal | Stage 5 background cutout |
| Fulfillment provider | Stage 6 product creation and Stage 7 publishing |

If a selected provider is disabled or missing its API key, the field is highlighted in red. Fix the key in environment variables or enable the provider in the **Providers** tab.

### Per-stage text models

Optionally override the AI provider and model for specific workflow stages:

- Gather Idea (Stage 1)
- Idea Validator (Stage 2)
- Image Prompts (Stage 3)
- Product metadata (Stage 5/6)

Leave a stage on **Global default** to inherit the top-level AI provider. Clear overrides with the **Clear** link on each stage card.

### Workflow defaults

Volume controls that shape how much output each run produces:

| Setting | Range | Description |
|---------|-------|-------------|
| Theme count | 1–50 | Themes generated per Gather Idea run |
| Winner count | 1–20 | Themes the validator selects as winners |
| Prompts per theme | 1–10 | Image prompts per winning theme |
| Images per prompt | 1–10 | Images generated per prompt |
| Max product variants | 1–100 | Color/size variants per product in placement |

### Idea research search

Stage 1 uses a search provider for Pinterest, TikTok, and web fallback research. Configure:

- **Default search provider** — Serper, SearchAPI, or SerpAPI
- **API keys** for each search service (stored encrypted per user; environment variables are the fallback)

Google Trends keyword enrichment requires SearchAPI or SerpAPI. Serper provides Google web search only.

### Validation API toggles

Optional real-API gates for Stage 2:

- **Trademark API** (RapidAPI) — Live trademark checks
- **Brand risk API** (SerpAPI) — Brand conflict screening
- **Marketplace research** — Etsy saturation data via SearchAPI or SerpAPI

Enable these only after adding the corresponding keys. Without keys, validation falls back to LLM-only assessment.

## Providers

The **Providers** tab shows which AI and image services are **available** in the UI, grouped by capability:

- **Text generation** — LLM providers for stages 1–3 and metadata
- **Image generation** — Providers that create images from prompts
- **Upscale** — Image enlargement services
- **Background removal** — Cutout providers

For each provider you can:

- See whether its environment API key is configured (green badge) or missing
- Enable or disable individual models
- Set a default model per provider
- Add or remove model IDs

Disabled providers cannot be selected in Defaults or during workflow runs. Environment variables (e.g. `NUXT_GEMINI_API_KEY`) must be set on the server; user-entered keys in Settings supplement or override env keys depending on credential source.

## Registry

The **Registry** tab is the editable capability map for your provider stack. Use it when adding custom or self-hosted providers.

Each registry row defines:

| Field | Purpose |
|-------|---------|
| Provider ID | Internal identifier used in code and API calls |
| Display label | Name shown in the UI |
| Enabled | Whether the provider appears in dropdowns |
| Capabilities | text-generation, generation, upscale, background-removal, fulfillment |
| Credential source | User or env, env only, or service env |
| Environment variable | Server env var that holds the API key |

Click **Add provider** to register a new entry. Use **Remove** to delete a row. Changes take effect after saving.

The Registry defines *what exists*; the Providers tab controls *which models are active* within each registered provider.

## Catalog

The **Catalog** tab manages product blueprints used in **Stage 6: Product Placement**. Blueprints come from your fulfillment provider (Printify by default).

### Browse and add

1. Select a product category (T-Shirts, Hoodies, Tank Tops, Caps, Totes, Cups).
2. Search the provider catalog.
3. Click **Add to catalog** on blueprints you want available during placement.

### Manage your catalog

The lower section lists saved catalog items per category. For each item you can:

- **Enable / disable** — Disabled items are hidden in Stage 6
- **Reorder** — Control sort order in the placement UI
- **Remove** — Delete from your saved catalog (does not delete provider blueprints)

Build your catalog before starting product placement. Stage 6 only shows enabled items from this list.

## Schedules (additional tab)

If your instance runs automated topic discovery, the **Schedules** tab lists pipeline schedules (daily, hourly, weekly cron jobs). Toggle schedules on or off and view last/next run times. Schedules created via the Telegram bot also appear here.

Telegram schedule management commands are documented in [Telegram Bot](./telegram-bot.md).

## Saving and Troubleshooting

- Unsaved changes show an amber indicator on **Save**.
- A green banner confirms success; red indicates validation or server errors.
- If providers show as missing, verify environment variables and restart the server.
- See [Troubleshooting](./troubleshooting.md) for API key and provider issues.

## Related Guides

- [Getting Started](./getting-started.md)
- [Stage 6: Product Placement](./stage-6-product-placement.md)
- [Telegram Bot](./telegram-bot.md)
