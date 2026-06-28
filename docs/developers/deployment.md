# Deployment

PrintPasa ships as a **Nuxt 4 Node server** (Nitro `node-server` preset). Choose a target based on whether you need persistent cron, local ML (background removal), and SQLite file storage.

---

## Deployment matrix

| Target | Database | Cron scheduler | Local BG removal | Best for |
|--------|----------|----------------|------------------|----------|
| Docker Compose | Volume SQLite | ✓ | ✓ | VPS, homelab |
| Fly.io | Turso or volume | ✓ | ✓ (2GB+ RAM) | Production single-region |
| Vercel + Turso | Turso remote | ✗ (use external cron) | Limited | Free tier, serverless |
| Cloudflare Pages | Static only | — | — | Docs + demo frontend |

---

## Docker Compose

The included `docker-compose.yml` builds from the repo `Dockerfile` and maps port **3001 → 3000**.

```bash
cp .env.example .env
docker compose build
docker compose up -d
```

| Setting | Value |
|---------|-------|
| Data persistence | `./data:/app/data` |
| Health check | `curl -f http://localhost:3000/api/health` |
| Entrypoint | Migrations → superuser seed → `node .output/server/index.mjs` |

### Production tips

- Mount `./data` on a persistent volume.
- Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` to use Turso instead of container SQLite.
- Allocate **≥2 GB RAM** if using `local-bg` background removal (ONNX runtime).
- Put a reverse proxy (Caddy, nginx) in front for TLS termination.

---

## Fly.io

Example configuration is in `fly.toml`. Customize before deploying:

```toml
app = 'your-printpasa-app-name'
primary_region = 'iad'

[mounts]
  source = 'printpasa_data'
  destination = '/data'
```

### Deploy steps

```bash
# Install flyctl, login
fly auth login

# Create app (first time)
fly apps create your-printpasa-app-name

# Create persistent volume
fly volumes create printpasa_data --size 1 --region iad

# Set secrets
fly secrets set \
  NUXT_SESSION_PASSWORD=... \
  NUXT_GEMINI_API_KEY=... \
  NUXT_FAL_API_KEY=... \
  NUXT_S3_ACCESS_KEY_ID=... \
  NUXT_S3_SECRET_ACCESS_KEY=... \
  NUXT_S3_BUCKET=... \
  TURSO_DATABASE_URL=libsql://... \
  TURSO_AUTH_TOKEN=...

# Deploy
fly deploy
```

The Docker entrypoint defaults to `file:/data/db/printpasa.db` when `TURSO_DATABASE_URL` is unset.

Health checks hit `/api/health` with a 90s grace period for cold starts and migrations.

### Why Fly.io?

- Long-running Node process (cron scheduler works in-process).
- Persistent volumes for SQLite fallback.
- Native Docker deployment from repo `Dockerfile`.

---

## Vercel + Turso

Serverless deployment works with **remote Turso** — local SQLite files are not suitable on ephemeral function instances.

### 1. Turso database

```bash
turso db create printpasa
turso db show printpasa --url
turso db tokens create printpasa

TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... pnpm db:push
```

### 2. Vercel project

Import the GitHub repo into Vercel. Build settings (auto-detected):

| Setting | Value |
|---------|-------|
| Framework | Nuxt.js |
| Build command | `pnpm build` |
| Output | `.output/public` (Nuxt handles serverless functions) |

### 3. Environment variables

Add all vars from [Configuration](./configuration.md). Minimum:

```env
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
NUXT_SESSION_PASSWORD=...
NUXT_PUBLIC_APP_URL=https://your-app.vercel.app
NUXT_GEMINI_API_KEY=...
NUXT_FAL_API_KEY=...
NUXT_S3_ACCESS_KEY_ID=...
NUXT_S3_SECRET_ACCESS_KEY=...
NUXT_S3_BUCKET=...
```

### 4. Limitations on Vercel

- **Cron scheduler** does not run reliably — use an external cron (GitHub Actions, cron-job.org) to hit `/api/internal/pipeline/process` with `x-service-token`.
- **Local background removal** may exceed function memory/timeout — prefer `photoroom` or `BACKGROUND_REMOVAL_PROVIDER=photoroom`.
- **Cold starts** add latency to first request after idle.

---

## Cloudflare Pages

Use Cloudflare Pages for two separate concerns:

### Documentation site

Host `docs/` as a static site (MkDocs, VitePress, or Cloudflare's direct MD rendering):

1. Connect repo to Cloudflare Pages.
2. Set build output to your docs generator's `dist/` (or serve `docs/` with a static site generator).
3. Custom domain: `docs.yourdomain.com`.

### Public demo

The live demo runs at **[demo.printpasa-demo.pages.dev](https://demo.printpasa-demo.pages.dev)**.

Recommended demo env:

```env
NUXT_DEMO_MODE=true
NUXT_DISABLE_AUTH=true
NUXT_DISABLE_SIGNUP=true
NUXT_PUBLIC_APP_URL=https://demo.printpasa-demo.pages.dev
```

Pair with Turso (shared read-only or sandbox DB) and sandbox API keys where providers support them (e.g. Photoroom `sandbox_` prefix).

For a full Nuxt SSR demo on Cloudflare, consider **Cloudflare Workers** via Nitro's `cloudflare-module` preset — this requires a separate build configuration not included in the default `node-server` preset. The default OSS Dockerfile targets Node.

---

## Environment checklist (all deployments)

- [ ] `NUXT_SESSION_PASSWORD` (32+ chars)
- [ ] `NUXT_PUBLIC_APP_URL` matches public URL
- [ ] Database URL + token (Turso for serverless)
- [ ] At least one AI + one image provider key
- [ ] S3 bucket with CORS configured
- [ ] Google OAuth credentials (if auth enabled)
- [ ] `NUXT_TELEGRAM_*` vars (if using Telegram bot)
- [ ] `NUXT_PIPELINE_OWNER_USER_ID` (if using automation)

---

## Health and monitoring

```bash
curl https://your-app.example.com/api/health
```

Returns `200` when the server is up. Docker Compose and Fly.io use this for health checks.

Monitor:

- Audit logs (`/api/audit-logs`) for auth anomalies
- Pipeline job failures in `pipeline_jobs.errorMessage`
- S3 upload errors in server logs (`[s3]` prefix)

---

## Related docs

- [Getting Started](./getting-started.md)
- [Configuration](./configuration.md)
- [Database → Turso](./database.md#turso-setup)
- [Storage → CORS](./storage.md#cors-policy-required)
