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

- Rotating `NUXT_SESSION_PASSWORD` and provider API keys
- Restricting network access to admin and database endpoints
- Keeping dependencies updated

Run `pnpm secrets:scan` locally before publishing forks or custom deployments.
