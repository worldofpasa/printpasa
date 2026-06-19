# Getting Started

PrintPasa is an open-source workflow tool for turning product ideas into print-on-demand designs. You move each project through a seven-stage pipeline—from trend research to published products—using AI for text and image generation and a fulfillment provider for product creation.

This guide covers account access, the dashboard, and creating your first project.

## Prerequisites

Before using the app, your administrator (or you, if self-hosting) must configure:

- A session secret (`NUXT_SESSION_PASSWORD`, at least 32 characters)
- At least one AI provider API key (Gemini, OpenAI, Anthropic, or similar)
- Optional but recommended: image generation, background removal, upscale, and fulfillment provider keys

See the project README for full environment setup.

## Signing In

PrintPasa supports two login modes depending on how the instance is configured.

### Google OAuth (default)

When authentication is enabled, visit the login page and sign in with your Google account. On first login, PrintPasa creates a workspace user tied to your Google identity. Only authorized Google accounts should be granted access—configure OAuth credentials in your deployment environment.

If authentication fails, you are redirected back to the login page with an error message. Verify that `NUXT_OAUTH_GOOGLE_CLIENT_ID` and `NUXT_OAUTH_GOOGLE_CLIENT_SECRET` are set correctly.

### Auth disabled (local development)

When `NUXT_DISABLE_AUTH=true`, the app skips OAuth and logs you in automatically as a local workspace user. This mode is intended for single-user local development only. Do not use it in production.

### Superuser access

Instances can also expose a hidden superuser login for administrators who need to see all projects and audit logs. See [Superuser](./superuser.md) for details.

## First Login

After signing in, you land on the **Dashboard**—your project board. The header shows:

- **Dashboard** — project list and filters
- **Settings** — defaults, providers, catalog, and more
- **Audit Logs** — visible only to superusers

Your name and avatar appear in the top-right corner. Use **Sign out** to end your session (hidden when auth is disabled).

## The Dashboard

The dashboard is your production queue. Each project appears as a card showing:

| Field | Meaning |
|-------|---------|
| Status chip | In production, Needs review, Published, or Archived |
| Current stage | Where the pipeline stopped (e.g. Image Generate) |
| Creator | Portal, Telegram, Cron, or a username |
| Progress bar | Approximate completion based on stage number (7 stages total) |
| Updated date | Last activity on the project |

### Dashboard filters

Use the filter bar to narrow the list:

- **Status** — All, Active, Needs review, Completed, Archived
- **Creator** — Filter by origin (Portal, Telegram, Cron, or a specific actor)
- **Date** — Filter by project creation date (single day or range)

Click any project card to **Resume** at its current stage.

### Project actions

Open the **⋯** menu on a card to:

- **Edit details** — Change name and description
- **Archive / Unarchive** — Hide from the active queue without deleting
- **Delete** — Permanently remove the project and all workflow data

## Creating Your First Project

1. Click **New Project** in the header (or navigate to `/projects/new`).
2. Optionally pick a **launch mode** preset to pre-fill the commercial brief:
   - Trend-led drop
   - Evergreen niche
   - Campaign sprint
3. Enter a **project name** (required). A URL slug is generated automatically.
4. Add a **commercial brief** describing audience, mood, timing, or goals. This can be refined in Stage 1.
5. Click **Create pipeline**.

You are taken directly to **Stage 1: Gather Idea**, where you describe the product idea, run research, and generate theme options.

## What Happens Next

Each project follows seven sequential stages:

1. **Gather Idea** — Research trends and generate themes
2. **Idea Validator** — Check IP safety and commercial viability
3. **Image Prompts** — Create detailed prompts for image generation
4. **Image Generate** — Produce design images
5. **Image Optimization** — Remove backgrounds and upscale
6. **Product Placement** — Place designs on catalog products
7. **Manual Review** — Publish products to your store

You must complete required actions at each stage before advancing. You can navigate backward to earlier stages at any time.

## Tips for New Users

- Configure **Settings → Defaults** before your first run so theme counts, providers, and workflow volumes match your workflow.
- Add product blueprints in **Settings → Catalog** before reaching Stage 6.
- Stages 3 and 4 use **destructive regeneration**—re-running generation replaces previous prompts or images. Read those stage guides before clicking Regenerate.
- Projects created via the Telegram bot or scheduled jobs appear on the dashboard like any other project.

## Related Guides

- [Settings](./settings.md) — Configure providers and defaults
- [Workflows](./workflows.md) — Resume, fork, and re-run stages
- [Stage 1: Gather Idea](./stage-1-gather-idea.md) — Start here after creating a project
- [FAQ](./faq.md) — Common questions
- [Troubleshooting](./troubleshooting.md) — Fix missing keys and failed generations
