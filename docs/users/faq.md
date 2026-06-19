# FAQ

Frequently asked questions about using PrintPasa.

## General

### What is PrintPasa?

PrintPasa is an open-source workflow application for creating print-on-demand t-shirt (and related) products. It guides you from product idea through AI-generated designs, image optimization, and fulfillment provider integration.

### How many stages are in the pipeline?

Seven stages: Gather Idea, Idea Validator, Image Prompts, Image Generate, Image Optimization, Product Placement, and Manual Review.

### Can I skip a stage?

No. Stages must be completed in order. You can navigate backward to earlier stages, but you cannot advance without meeting each stage’s requirements.

### What happens if I close the browser mid-workflow?

Progress is saved to the database at each step (saved selections, generated records, created products). Reopen the project from the dashboard to resume.

## Account and Access

### Do I need a Google account?

No. PrintPasa supports **email/password** sign-up and sign-in by default. Google OAuth is optional when `NUXT_OAUTH_GOOGLE_*` is configured. For local development, auth can be disabled with `NUXT_DISABLE_AUTH=true`.

### What is superuser login?

An admin account (`NUXT_SUPERUSER_USERNAME` / `NUXT_SUPERUSER_PASSWORD`) with cross-workspace visibility and audit log access. See [Superuser](./superuser.md).

### Can multiple people use one instance?

Yes. Each account gets its own user record and project list. Superusers see all projects. Self-hosted instances often use email sign-up or a single admin account.

## Projects and Workflow

### What is the difference between current stage and unfinished work?

**Current stage** is the furthest stage you advanced to. You may still have incomplete selections within that stage or earlier ones—use the stepper to navigate and finish required actions.

### What does forking do?

Forking copies project data into a new project starting at your current stage. Use it before destructive regeneration. See [Workflows → Forking](./workflows.md#forking-a-project).

### Does deleting a project remove products from my store?

No. Delete removes PrintPasa workflow data only. Products already published via your fulfillment provider remain in the provider/store—you must manage them there separately.

### What is “Needs review” on the dashboard?

Active projects sitting at Stage 7 (Manual Review) awaiting publish action.

## Generation and AI

### Which AI provider should I use?

Any enabled text provider in Settings works for stages 1–3. Gemini is a common default. Match provider strengths to your content (JSON structured output for validation and prompts).

### Why did my image generation fail?

Common causes: missing image API key, rate limits, prompt safety filters, or provider timeout. See [Troubleshooting](./troubleshooting.md#failed-ai-or-image-generations).

### Will regenerating prompts delete my images?

Not directly—but old prompts become superseded, and Stage 4 uses active prompts only. You may need to regenerate images after a Stage 3 regen. Old images are superseded when you regenerate in Stage 4.

### Does Stage 1 delete old themes when I generate again?

No. Stage 1 **appends** themes. Stages 3 and 4 **replace** active prompts and images.

## Settings and Providers

### Where do API keys go?

Server environment variables (e.g. `NUXT_GEMINI_API_KEY`) are the primary source. Some keys can also be entered in **Settings → Defaults** (search keys, provider overrides). User-stored keys are persisted in the database.

### Why is my provider shown in red?

The provider is disabled in the Providers tab, or its API key is missing from both env and user settings.

### What is the difference between Providers and Registry tabs?

**Registry** defines provider entries and capabilities. **Providers** toggles models and shows key status per capability. See [Settings](./settings.md).

## Product and Fulfillment

### Which fulfillment providers are supported?

Printify is fully implemented. Printful may appear as a stub depending on your version—check **Settings → Registry**.

### Why are no products shown in Stage 6?

Add and enable blueprints in **Settings → Catalog** first.

### What format are SKUs?

Auto-generated codes like `PP-{NICHE}-{THEME}-TEE-{SEQ}`. Forked projects append a hash suffix to avoid collisions.

## Telegram and Automation

### How do I start a project from Telegram?

Send `/idea your product idea` to the configured bot. See [Telegram Bot](./telegram-bot.md).

### Where do Telegram projects appear?

On the dashboard for the pipeline owner user, filterable by Creator = Telegram.

## Storage

### Where are images stored?

Generated and optimized images upload to S3 (or S3-compatible storage) when configured. Legacy rows may use provider URLs until migrated.

### Why does the editor show a blank canvas?

Often an S3 CORS misconfiguration. See [Troubleshooting → S3 CORS](./troubleshooting.md#s3-cors-errors-in-the-editor).

## Getting Help

- [Troubleshooting](./troubleshooting.md) — Fix common errors
- [Getting Started](./getting-started.md) — Setup walkthrough
- GitHub Issues — Report bugs in the open-source repository
