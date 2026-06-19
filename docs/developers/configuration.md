# Configuration

PrintPasa reads configuration from environment variables. Variables prefixed with `NUXT_` are mapped into Nuxt `runtimeConfig` and available server-side via `useRuntimeConfig()`. A few non-`NUXT_` variables are read directly from `process.env`.

Copy `.env.example` to `.env` and fill in values for your deployment.

---

## Core

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NUXT_SESSION_PASSWORD` | **Yes** (when auth enabled) | — | Secret for encrypting session cookies. Minimum 32 random characters. |
| `NUXT_PUBLIC_APP_URL` | Recommended | `''` | Public base URL (e.g. `https://app.example.com`). Used for webhooks, pipeline callbacks, and OAuth redirects. |
| `NODE_ENV` | No | `development` | `production` in deployed environments. |
| `HOST` | No | `0.0.0.0` | Nitro bind address. |
| `PORT` | No | `3000` | HTTP listen port. |

---

## Authentication

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NUXT_OAUTH_GOOGLE_CLIENT_ID` | For Google login | — | Google OAuth 2.0 client ID. |
| `NUXT_OAUTH_GOOGLE_CLIENT_SECRET` | For Google login | — | Google OAuth 2.0 client secret. |
| `NUXT_DISABLE_AUTH` | No | `false` | Set to `true` to bypass login — auto-provisions a local superuser workspace user. **Dev only.** |
| `NUXT_DISABLE_SIGNUP` | No | `false` | When `true`, blocks new email sign-ups. Existing users can still sign in. |
| `NUXT_SUPERUSER_USERNAME` | No | `admin` | Username/id for the seeded superuser account. |
| `NUXT_SUPERUSER_PASSWORD` | No | — | Password for the seeded superuser (stored in `auth_accounts` via Better Auth). |
| `NUXT_SERVICE_TOKEN` | For automation | — | Shared secret for service-to-service API calls via `x-service-token` header. |
| `NUXT_SERVICE_PROTECTED_PREFIXES` | No | `''` | Comma-separated URL prefixes that require `x-service-token` even without a user session (e.g. `/api/internal`). |

See [Authentication](./authentication.md) for login flows.

---

## Database

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TURSO_DATABASE_URL` | No | `file:./data/printpasa.db` | LibSQL connection URL. Use `libsql://…` for remote Turso. |
| `TURSO_AUTH_TOKEN` | For remote Turso | — | Auth token for Turso cloud databases. Leave empty for local `file:` URLs. |

See [Database](./database.md) for migration workflows.

---

## Storage (S3)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NUXT_S3_ACCESS_KEY_ID` | For S3 | — | AWS or compatible access key ID. |
| `NUXT_S3_SECRET_ACCESS_KEY` | For S3 | — | AWS or compatible secret access key. |
| `NUXT_S3_BUCKET` | For S3 | — | Bucket name for generated images. |
| `NUXT_S3_REGION` | No | `us-east-2` | AWS region (ignored for custom endpoints). |
| `NUXT_S3_ENDPOINT` | No | — | Custom S3 endpoint for R2, MinIO, etc. Enables path-style URLs. |

Without S3 configured, images may fall back to provider-hosted URLs (not recommended for production).

See [Storage](./storage.md) for CORS setup.

---

## AI (text generation)

At least one text provider key is required for Stages 1–3 and validation.

| Variable | Provider |
|----------|----------|
| `NUXT_GEMINI_API_KEY` | Google Gemini (default) |
| `NUXT_OPENAI_API_KEY` | OpenAI |
| `NUXT_ANTHROPIC_API_KEY` | Anthropic |
| `NUXT_XAI_API_KEY` | xAI (Grok) |
| `NUXT_GROQ_API_KEY` | Groq |
| `NUXT_TOGETHER_API_KEY` | Together.ai |
| `NUXT_DEEPINFRA_API_KEY` | DeepInfra |

### Defaults

| Variable | Default |
|----------|---------|
| `NUXT_DEFAULT_AI_PROVIDER` | `gemini` |

Per-user keys can override env defaults in **Settings → Providers**.

---

## Image generation, upscale, and background removal

### Image generation (Stage 4)

| Variable | Provider |
|----------|----------|
| `NUXT_KREA_API_KEY` | Krea.ai |
| `NUXT_FAL_API_KEY` | Fal.ai (default) |

| Variable | Default |
|----------|---------|
| `NUXT_DEFAULT_IMAGE_PROVIDER` | `fal` |

### Upscale (Stage 5)

| Variable | Provider |
|----------|----------|
| `NUXT_LEONARDO_API_KEY` | Leonardo |
| `NUXT_REPLICATE_API_TOKEN` | Replicate |
| `NUXT_TOPAZ_API_KEY` | Topaz Gigapixel |
| `NUXT_PHOTOROOM_API_KEY` | Photoroom (also BG removal) |

| Variable | Default |
|----------|---------|
| `NUXT_DEFAULT_UPSCALE_PROVIDER` | `local` |

`local` uses in-process sharp Lanczos3 — no API key required.

### Background removal (Stage 5)

| Variable | Provider |
|----------|----------|
| `NUXT_PHOTOROOM_API_KEY` | Photoroom |
| `NUXT_BRIA_API_KEY` | Bria |
| `NUXT_LEONARDO_API_KEY` | Leonardo |

Non-NUXT variables (read directly from `process.env`):

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKGROUND_REMOVAL_PROVIDER` | `local-bg` | Provider id: `local-bg`, `photoroom`, `leonardo`, `bria` |
| `PHOTOROOM_API_KEY` | — | Alternative env name for Photoroom (supports `sandbox_` prefix) |
| `PHOTOROOM_SEGMENT_URL` | — | Override Photoroom segment API URL |

| Variable | Default |
|----------|---------|
| `NUXT_DEFAULT_BACKGROUND_REMOVAL_PROVIDER` | `local-bg` |

---

## Fulfillment

| Variable | Provider |
|----------|----------|
| `NUXT_PRINTIFY_API_KEY` | Printify (default) |
| `NUXT_PRINTFUL_API_KEY` | Printful |

| Variable | Default |
|----------|---------|
| `NUXT_DEFAULT_FULFILLMENT_PROVIDER` | `printify` |

Users can also set `printifyShopId` in Settings for multi-shop accounts.

---

## IP validation and research (Stage 2)

| Variable | Purpose |
|----------|---------|
| `NUXT_RAPIDAPI_KEY` | USPTO trademark check via RapidAPI |
| `NUXT_SERPAPI_KEY` | Brand-risk Google search via SerpAPI |
| `NUXT_SEARCHAPI_KEY` | SearchAPI.io (also used for trend research) |
| `NUXT_SERPER_API_KEY` | Serper.dev search |
| `NUXT_DEFAULT_SEARCH_PROVIDER` | Default search provider id |

### Reddit (trend research)

| Variable | Description |
|----------|-------------|
| `NUXT_REDDIT_CLIENT_ID` | Reddit OAuth app client ID |
| `NUXT_REDDIT_CLIENT_SECRET` | Reddit OAuth app secret |
| `NUXT_REDDIT_USER_AGENT` | User-Agent string (required by Reddit API) |

Without Reddit OAuth or a search API key, Reddit trend fetching may be limited from server IPs.

---

## Telegram

| Variable | Required | Description |
|----------|----------|-------------|
| `NUXT_TELEGRAM_BOT_TOKEN` | For bot | Bot token from [@BotFather](https://t.me/BotFather). |
| `NUXT_TELEGRAM_WEBHOOK_SECRET` | Recommended | Secret token sent in `X-Telegram-Bot-Api-Secret-Token` header; validated on webhook POST. |
| `NUXT_TELEGRAM_ALLOWED_CHAT_IDS` | Recommended | Comma-separated chat IDs allowed to send commands (e.g. `-1001234567890,123456789`). Empty = allow all. |
| `NUXT_TELEGRAM_TOPIC_IDEA_GENERATION` | No | Forum topic ID for idea-generation notifications. |
| `NUXT_TELEGRAM_TOPIC_DESIGN_REVIEW` | No | Forum topic ID for design review notifications. |

See [Telegram](./telegram.md).

---

## Pipeline

| Variable | Required | Description |
|----------|----------|-------------|
| `NUXT_PIPELINE_OWNER_USER_ID` | For automation | User ID that owns projects created by Telegram/cron pipelines. |
| `NUXT_PIPELINE_PARSE_IDEA_WITH_AI` | No | `true` to parse free-text `/idea` input with AI before starting pipeline. |
| `CRON_TIMEZONE` | No | IANA timezone for schedule calculations (default: `America/Chicago`). |

The cron scheduler runs inside the Nitro process (1-minute tick). It claims due rows from `pipeline_schedules` and triggers automated trend discovery.

---

## Demo mode

| Variable | Default | Description |
|----------|---------|-------------|
| `NUXT_DEMO_MODE` | `false` | Enables read-only public demo behavior. Typical demo deployment settings: |

```env
NUXT_DEMO_MODE=true
NUXT_DISABLE_AUTH=true
NUXT_DISABLE_SIGNUP=true
```

When demo mode is active:

- Destructive provider calls (fulfillment publish, external API writes) should be disabled or sandboxed.
- Use pre-seeded demo projects or restrict project creation in the UI.
- Pair with `NUXT_DISABLE_AUTH=true` for the public demo at [demo.printpasa-demo.pages.dev](https://demo.printpasa-demo.pages.dev).

Deploy demo static docs and the demo app separately on Cloudflare Pages — see [Deployment → Cloudflare Pages](./deployment.md#cloudflare-pages).

---

## Example `.env` for local development

```env
# Core
NUXT_SESSION_PASSWORD=change-me-to-a-random-string-at-least-32-chars
NUXT_PUBLIC_APP_URL=http://localhost:3000

# Auth (optional for local — or use NUXT_DISABLE_AUTH=true)
NUXT_OAUTH_GOOGLE_CLIENT_ID=
NUXT_OAUTH_GOOGLE_CLIENT_SECRET=
NUXT_DISABLE_AUTH=true

# Database
TURSO_DATABASE_URL=file:./data/printpasa.db

# AI + Image (minimum)
NUXT_GEMINI_API_KEY=your-key
NUXT_FAL_API_KEY=your-key

# Storage (optional locally)
NUXT_S3_ACCESS_KEY_ID=
NUXT_S3_SECRET_ACCESS_KEY=
NUXT_S3_BUCKET=your-bucket
NUXT_S3_REGION=us-east-2

# Fulfillment (Stage 6+)
NUXT_PRINTIFY_API_KEY=your-key
```

---

## Runtime config mapping

Nuxt automatically maps `NUXT_*` env vars to camelCase keys in `runtimeConfig`. For example:

| Environment variable | `runtimeConfig` key |
|---------------------|---------------------|
| `NUXT_GEMINI_API_KEY` | `geminiApiKey` |
| `NUXT_S3_BUCKET` | `s3Bucket` |
| `NUXT_TELEGRAM_BOT_TOKEN` | `telegramBotToken` |

Public vars use the `NUXT_PUBLIC_` prefix and appear in `runtimeConfig.public`.
