# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2026-07-05

### Security
- Auth now refuses to start in production without a real `NUXT_SESSION_PASSWORD`
  (≥32 chars); removed the public dev-secret fallback outside dev/demo.
- Telegram webhook now requires `NUXT_TELEGRAM_WEBHOOK_SECRET` (previously
  unauthenticated when the secret was unset).
- Enforce a minimum password length of 12 characters.
- Boot-time warnings for `NUXT_DISABLE_AUTH=true` and open signup in production.

### Fixed
- Docker Compose SQLite data-loss trap: the database now lives on the mounted
  `/app/data` volume and survives `docker compose down`/rebuild.
- Default cron timezone is now UTC (was `America/Chicago`).
- Reconciled `.env.example` and docs env-var drift (added `NUXT_BRIA_API_KEY`
  and `NUXT_TOPAZ_API_KEY`, removed dead non-`NUXT_` variables).

### Added
- Optional MinIO `local-storage` Docker Compose profile with automatic bucket
  creation, for fully self-hosted (no-cloud) image storage.
- `DISCLAIMER.md` covering AI-generation IP, content-moderation, cost, and
  print-on-demand risks; linked from the README.
- Production-deployment prerequisites and fully-local setup guide in the README.
- OSS health: `license` field in `package.json`, `CODE_OF_CONDUCT.md`,
  GitHub issue/PR templates, Dependabot config, and a PR build CI workflow.

### Changed
- Deploy workflows are gated to the canonical repository so forks don't get
  failing CI runs.

## [0.1.0]

Initial open-source release.

### Added
- Seven-stage AI t-shirt design pipeline: gather idea → validate → prompts → generate → optimize → placement → review/publish.
- Provider-agnostic AI, image, background-removal, upscale, search, and fulfillment integrations.
- Better Auth (email/password + optional Google OAuth) with superuser seeding.
- Telegram pipeline operator with scheduled runs.
- Drizzle ORM over LibSQL/Turso (local SQLite by default).
- S3-compatible image storage (AWS S3, Cloudflare R2, MinIO).
- Deploy targets: Docker, Fly.io, Vercel + Turso, Cloudflare Pages.
