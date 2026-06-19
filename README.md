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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security reports: [SECURITY.md](SECURITY.md).

## License

MIT — see [LICENSE](LICENSE).
