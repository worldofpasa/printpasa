# CLAUDE.md

Instructions for AI coding agents working on this project. Read AGENTS.md for full architecture details.

## Golden Rules

### 1. Think Before Coding

- State assumptions explicitly. If uncertain, ask.
- If multiple approaches exist, present them — don't pick silently.
- If a simpler approach exists, say so.

### 2. Simplicity First

- No features beyond what was asked.
- No abstractions for single-use code.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

### 3. Surgical Changes

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- Remove imports/variables that YOUR changes made unused. Don't remove pre-existing dead code.

### 4. Goal-Driven Execution

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Reproduce it first, then fix"

For multi-step tasks, state a brief plan with verification steps.

## Project-Specific Rules

### Read Before Write
Always read a file before editing it. Understand what exists before changing anything.

### Database Changes
- Edit schema files in `server/database/schema/`, then run `pnpm db:push`
- Never write raw SQL — use Drizzle ORM query builder
- All IDs are `crypto.randomUUID()`
- Respect CASCADE delete chains: projects → themes → imagePrompts → generatedImages

### API Routes
- Always call `requireUser(event)` first for auth
- Always verify project ownership with `userId` check
- Validate request bodies with Zod schemas via `readValidatedBody`
- Return errors via `createError({ statusCode, statusMessage })`

### Frontend
- Use Nuxt auto-imports — don't add explicit `import { ref, computed } from 'vue'`
- Use Tailwind classes for all styling, never create separate CSS
- Stage components live in `app/components/workflow/` — one per stage
- Follow existing button/card animation patterns (see AGENTS.md > Coding Conventions)

### Provider Pattern
When adding a new provider (AI, image, or fulfillment):
1. Implement the interface in `server/services/{category}/providers/{name}.ts`
2. Add it to the factory function in `server/services/{category}/index.ts`
3. Add the API key to: schema (`settings.ts`), `.env.example`, `nuxt.config.ts` runtimeConfig, and `shared/types/providers.ts`

### The Workflow Is the Product
The 6-stage pipeline is the core domain (see AGENTS.md > The 6-Stage Workflow). Every change must preserve:
- Linear stage progression with selection gates
- Stage readiness checks in `useWorkflow`
- The ability to navigate backward and re-run any stage
- Fork functionality at any stage

### Destructive Regeneration Warning
Stages 3 and 4 DELETE previous outputs before regenerating. If you're modifying these endpoints, understand that regeneration is lossy. See AGENTS.md > Destructive Regeneration for details.

### Image Storage
Generated images are uploaded to an S3-compatible store (configured via `NUXT_S3_*`) at generation time via `server/services/storage/s3.ts` and served via short-lived presigned GET URLs. Legacy rows whose `s3KeyGenerated` is null can be migrated via `POST /api/workflow/[projectId]/images/backfill-s3`. The bucket needs CORS configured (`AllowedMethods: ["GET","HEAD"]`, your dev + prod origins) so `<img crossOrigin="anonymous">` loads work in the Stage 5 editor — see [`docs/developers/storage.md`](docs/developers/storage.md) for the CORS policy JSON. `NUXT_S3_ENDPOINT` supports S3-compatible alternatives (Cloudflare R2, or the bundled MinIO `local-storage` compose profile) for fully self-hosted deployments.

## Commands

```bash
pnpm dev              # Development server
pnpm build            # Production build
pnpm db:push          # Apply schema changes
pnpm db:studio        # Visual DB browser
pnpm db:generate      # Generate migration SQL
pnpm db:migrate       # Run migrations
```

## Don't

- Don't auto-commit or push without being asked
- Don't add documentation files unless explicitly requested
- Don't refactor the provider factory pattern — it's intentionally simple
- Don't bypass `requireUser` for any workflow endpoint
- Don't store images as blobs in SQLite — upload to S3 via `uploadImage` and persist the S3 key
- Don't add packages without checking if the existing stack already handles it
