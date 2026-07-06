# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `CODE_OF_CONDUCT.md`, GitHub issue/PR templates, and Dependabot config.
- `license` field in `package.json`.
- Self-hosting hardening: fully-local storage guidance and optional MinIO in Docker Compose.
- Content and cost disclaimers for AI generation and print-on-demand fulfillment.

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
