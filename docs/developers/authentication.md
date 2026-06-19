# Authentication

PrintPasa uses **[Better Auth](https://www.better-auth.com/)** with the Drizzle adapter. Users sign in with **email/password**; **Google OAuth** is enabled when `NUXT_OAUTH_GOOGLE_*` is set.

## Endpoints

Better Auth handler: `/api/auth/*`

| Endpoint | Description |
|----------|-------------|
| `GET /api/auth/session` | App session wrapper (current user) |

All workflow routes call `requireUser(event)` — unchanged contract for 60+ endpoints.

## Email / password

Open signup by default. Disable with `NUXT_DISABLE_SIGNUP=true` for single-operator installs.

```env
NUXT_SESSION_PASSWORD=your-32-char-minimum-secret
NUXT_PUBLIC_APP_URL=http://localhost:3000
```

## Google OAuth (optional)

```env
NUXT_OAUTH_GOOGLE_CLIENT_ID=
NUXT_OAUTH_GOOGLE_CLIENT_SECRET=
```

Redirect URI: `{NUXT_PUBLIC_APP_URL}/api/auth/callback/google`

## Superuser

Set `NUXT_SUPERUSER_USERNAME` (default `admin`) and `NUXT_SUPERUSER_PASSWORD`. Seeded on startup into `users` + `auth_accounts` with `role=superuser`.

Superuser can view all projects and audit logs.

## Development bypass

`NUXT_DISABLE_AUTH=true` — synthetic local user, no login UI.

## Service token

`NUXT_SERVICE_TOKEN` + header `x-service-token` — synthetic `service-agent` superuser for automation.

## Demo mode

`NUXT_DEMO_MODE=true` — read-only; server middleware blocks mutating API calls.

## Database tables

- `users` — profile + `role`
- `auth_sessions`, `auth_accounts`, `auth_verifications` — Better Auth

Legacy `superuser_secrets` is no longer used.
