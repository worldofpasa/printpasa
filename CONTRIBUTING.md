# Contributing to PrintPasa

Thank you for contributing to PrintPasa! This project is part of [World of Pasa](https://github.com/worldofpasa).

## Development setup

```bash
git clone https://github.com/worldofpasa/printpasa.git
cd printpasa
pnpm install
cp .env.example .env
pnpm db:push
pnpm dev
```

See [docs/developers/getting-started.md](docs/developers/getting-started.md) for full setup including Docker and Turso.

## Branching and PRs

1. Fork the repo and create a feature branch from `main`.
2. Keep changes focused — one concern per PR when possible.
3. Run `pnpm secrets:scan` before pushing (never commit `.env` or API keys).
4. Describe what changed and how to test it in the PR body.

## Provider pattern

New AI, image, fulfillment, or trend providers follow the factory pattern under `server/services/`. See [docs/developers/providers.md](docs/developers/providers.md) for a step-by-step guide.

## Code style

- TypeScript strict mode; use Nuxt auto-imports.
- Tailwind for styling; Drizzle ORM for database access.
- Zod for API request validation.
- Match existing naming and file layout in the area you are editing.

## Security

Report vulnerabilities per [SECURITY.md](SECURITY.md). Do not open public issues for security bugs.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
