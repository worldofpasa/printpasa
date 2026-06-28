# Getting Started

This guide walks through running PrintPasa locally, configuring environment variables, and starting the development server.

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Node.js** | 20+ (22 recommended for Docker builds) | Use `nvm` or `fnm` to manage versions |
| **pnpm** | 10+ | `npm install -g pnpm` or enable via Corepack |
| **Git** | Any recent version | Clone the repository |

Optional but commonly needed:

- An **AI provider API key** (Gemini is the default)
- An **image provider API key** (Fal.ai is the default)
- **AWS S3** or S3-compatible storage for persistent generated images
- **Google OAuth credentials** if auth is enabled (see [Authentication](./authentication.md))

---

## Installation

```bash
# Clone the repository
git clone https://github.com/worldofpasa/printpasa.git
cd printpasa

# Install dependencies
pnpm install
```

PrintPasa uses Nuxt 4 with Nitro's `node-server` preset. Native modules (`sharp`, `@libsql/client`, ONNX runtime for local background removal) install automatically on supported platforms.

---

## Environment configuration

Copy the example environment file and edit it:

```bash
cp .env.example .env
```

At minimum, set:

```env
# Required — encrypts session cookies (min 32 random characters)
NUXT_SESSION_PASSWORD=your-long-random-secret-at-least-32-chars

# Required for AI stages — pick at least one text provider
NUXT_GEMINI_API_KEY=your-gemini-key

# Local database (default)
TURSO_DATABASE_URL=file:./data/printpasa.db
TURSO_AUTH_TOKEN=
```

For a full variable reference grouped by category, see [Configuration](./configuration.md).

### Quick local dev without OAuth

To skip login during development:

```env
NUXT_DISABLE_AUTH=true
```

This auto-provisions a local superuser bypass account on first request.

---

## Database setup

PrintPasa uses **LibSQL** (SQLite locally, Turso remotely) with **Drizzle ORM**.

Apply the schema to your database:

```bash
pnpm db:push
```

Other database commands:

| Command | Purpose |
|---------|---------|
| `pnpm db:push` | Push schema changes directly (fast, good for dev) |
| `pnpm db:generate` | Generate SQL migration files |
| `pnpm db:migrate` | Run pending migrations + seed superuser |
| `pnpm db:studio` | Open Drizzle Studio (visual browser) |
| `pnpm db:push:turso` | Push schema to remote Turso |
| `pnpm db:migrate:turso` | Migrate remote Turso |

The SQLite file is created at `./data/printpasa.db` by default. The `data/` directory is gitignored.

On first startup, Nitro plugins automatically:

- Seed the provider registry into the `providers` table
- Seed pipeline cron schedules (disabled by default)
- Create the superuser account if `NUXT_SUPERUSER_PASSWORD` is set

See [Database](./database.md) for schema details and Turso setup.

---

## Start the development server

```bash
pnpm dev
```

The app is available at **http://localhost:3000**.

Alternative port (used by pipeline integration tests):

```bash
pnpm dev:local   # PORT=3456, NUXT_PUBLIC_APP_URL=http://localhost:3456
```

### Verify the install

1. Open http://localhost:3000 — you should see the project dashboard (or login page).
2. Hit the health endpoint: `curl http://localhost:3000/api/health`
3. Create a project and walk through Stage 1 (Gather Idea).

---

## Docker Compose

For a production-like local run with persistent data:

```bash
cp .env.example .env
# Edit .env with your keys

docker compose build
docker compose up -d
```

| Setting | Value |
|---------|-------|
| Host port | `3001` → container `3000` |
| Data volume | `./data:/app/data` (SQLite) |
| Health check | `GET /api/health` every 30s |

```bash
# View logs
docker compose logs -f

# Stop
docker compose down
```

The container entrypoint runs migrations, seeds the superuser, then starts the Nitro server. See [Deployment](./deployment.md) for production Docker notes.

---

## Project scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Development server with HMR |
| `pnpm build` | Production build (`db:migrate` + `nuxt build`) |
| `pnpm preview` | Preview production build locally |
| `pnpm db:push` | Apply schema to database |
| `pnpm db:studio` | Drizzle Studio |
| `pnpm test:telegram-webhook` | Test Telegram webhook locally |
| `pnpm secrets:scan` | Run gitleaks secret scanner |

---

## Next steps

- [Architecture](./architecture.md) — Understand the 7-stage workflow
- [Configuration](./configuration.md) — All environment variables
- [Authentication](./authentication.md) — OAuth, superuser, service tokens
- [Providers](./providers.md) — AI, image, and fulfillment providers
- [Storage](./storage.md) — S3 bucket setup and CORS
