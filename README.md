# PrintPasa

Self-hosted AI t-shirt design pipeline — seven stages from trend research to Printify publish.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Part of [World of Pasa](https://github.com/worldofpasa).

## Links

- **Documentation:** [printpasa-docs.pages.dev](https://printpasa-docs.pages.dev)
- **Live demo (read-only):** [printpasa-demo.pages.dev](https://printpasa-demo.pages.dev)
- **User guide:** [docs/users/getting-started](docs/users/getting-started.md)
- **Developer guide:** [docs/developers/getting-started](docs/developers/getting-started.md)

## Features

- Seven-stage workflow: gather idea → validate → prompts → generate → optimize → placement → review
- Provider-agnostic AI, image, background removal, and fulfillment integrations
- Better Auth: email/password + optional Google OAuth
- Telegram pipeline operator (`/idea`, scheduled runs)
- Docker, Fly.io, Vercel + Turso, Cloudflare Pages

## Quick start

```bash
git clone https://github.com/worldofpasa/printpasa.git
cd printpasa
pnpm install
cp .env.example .env
# Set NUXT_SESSION_PASSWORD and at least one AI key (e.g. NUXT_GEMINI_API_KEY)
pnpm db:push
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up or sign in as superuser (`NUXT_SUPERUSER_USERNAME` / `NUXT_SUPERUSER_PASSWORD`).

### Docker

```bash
cp .env.example .env
docker compose up --build
```

## Minimum viable setup

With **one AI provider key** + `local-bg` + `local` upscale you can run stages 1–5. Fulfillment (Printify) is optional for stages 6–7.

## Fully self-hosted (no cloud accounts)

PrintPasa runs without any managed cloud service:

- **Database:** local SQLite by default (`TURSO_DATABASE_URL=file:./data/printpasa.db`). Turso is optional.
- **Image storage:** image storage is S3-compatible. To avoid AWS entirely, run the bundled MinIO service:

  ```bash
  docker compose --profile local-storage up --build
  ```

  Then set in `.env`:

  ```env
  NUXT_S3_ENDPOINT=http://minio:9000
  NUXT_S3_ACCESS_KEY_ID=minioadmin
  NUXT_S3_SECRET_ACCESS_KEY=minioadmin
  NUXT_S3_BUCKET=printpasa
  NUXT_S3_REGION=us-east-1
  ```

  Create the `printpasa` bucket once via the MinIO console at [localhost:9001](http://localhost:9001).

- **Text AI:** works with any OpenAI-compatible endpoint (including local runtimes like Ollama/vLLM) — set a custom base URL in provider settings.
- **Image generation:** currently requires a hosted provider (fal, Krea, Leonardo, Replicate). There is no local image-generation adapter yet, so this is the one remaining hard external dependency for stages 4–5. Background removal and upscale both have `local` options.

> **Note:** an S3-compatible store is required for image storage — there is no local-filesystem backend. MinIO (above), Cloudflare R2, or AWS S3 all work.

## Disclaimer

PrintPasa generates content with AI and publishes to print-on-demand services. You are
responsible for intellectual-property compliance, content moderation, and per-request AI
costs. Read [DISCLAIMER.md](DISCLAIMER.md) before commercial use.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security reports: [SECURITY.md](SECURITY.md).

## License

MIT — see [LICENSE](LICENSE).
