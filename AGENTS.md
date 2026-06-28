# AGENTS.md

Technical reference for AI agents working on PrintPasa OSS.

## Quick start

```bash
pnpm install && cp .env.example .env
pnpm db:push && pnpm dev
```

## Stack

Nuxt 4, Drizzle + LibSQL/Turso, Better Auth, Tailwind + shadcn-vue, seven-stage workflow.

## Auth

- Better Auth at `/api/auth/*` — email/password, optional Google
- `requireUser()` in `server/utils/auth.ts` — session, service token, dev bypass, demo mode
- Superuser: `NUXT_SUPERUSER_USERNAME` / `NUXT_SUPERUSER_PASSWORD` → `role=superuser`

## Seven stages

gather-idea → idea-validator → image-prompts → image-generate → image-optimization → product-placement → manual-review

Stages 3–4 destructive on regenerate.

## Demo mode

`NUXT_DEMO_MODE=true` — read-only; `server/middleware/demo-mode.ts` blocks mutations.

## Docs site

`pnpm docs:dev` — VitePress in `docs/`

## Secrets

`pnpm secrets:scan` before any public push.
