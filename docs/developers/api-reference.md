# API reference

All routes require authentication unless noted. Pass `x-service-token` for automation when `NUXT_SERVICE_TOKEN` is configured.

## Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Liveness check |

## Auth

Better Auth handler: `/api/auth/*` (sign-in, sign-up, session, OAuth).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/session` | Current user (app wrapper) |

## Projects

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects` | List projects for current user |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get project |
| PATCH | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |

## Workflow (`/api/workflow/:projectId/...`)

Stage-specific endpoints under `gather-idea`, `validate`, `prompts`, `images`, `products`, `review`. Each verifies project ownership via `requireUser()`.

## Settings

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/settings` | User settings and API keys |
| PUT | `/api/settings` | Update settings |

## Internal / pipeline

Telegram webhook and scheduled pipeline triggers under `/api/internal/` and `/api/telegram/` — require service token or configured secrets.

See source under `server/api/` for the full route tree.
