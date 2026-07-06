# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes       |

## Reporting a vulnerability

**Do not** open a public GitHub issue for security vulnerabilities.

Email **security@worldofpasa.com** (or open a private security advisory on GitHub if email is unavailable) with:

- Description of the issue and potential impact
- Steps to reproduce
- Affected version or commit

We aim to acknowledge reports within 72 hours and will coordinate disclosure timing with you.

## Self-hosted deployments

PrintPasa is designed for self-hosting. You are responsible for:

- Setting a strong random `NUXT_SESSION_PASSWORD` (≥32 chars; the app refuses to
  start in production without it). Generate with `openssl rand -base64 32`.
- Rotating provider API keys and the Telegram bot token if ever exposed.
- Restricting network access to admin and database endpoints.
- Keeping dependencies updated.

### Internet-exposed instances

If your instance is reachable from the internet:

- **Set `NUXT_DISABLE_SIGNUP=true`** unless you intend open registration. New users
  fall back to the operator's provider API keys, so open signup means **strangers can
  spend your AI credits and publish to your Printify shop**.
- Set `NUXT_TELEGRAM_WEBHOOK_SECRET` if you enable the Telegram bot (the webhook
  refuses to run without it).
- Serve over HTTPS and ensure `NUXT_PUBLIC_APP_URL` matches your public origin
  (required for Better Auth cookies and OAuth callbacks).

Run `pnpm secrets:scan` locally before publishing forks or custom deployments.
