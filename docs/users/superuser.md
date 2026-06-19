# Superuser

Superuser mode gives administrators cross-workspace visibility: all projects from every user, plus access to system audit logs. Regular users see only their own projects.

## Enabling Superuser

Superuser access requires server-side configuration at deploy time:

```bash
NUXT_SUPERUSER_USERNAME=admin   # optional, default: admin
NUXT_SUPERUSER_PASSWORD=your-secret-password
```

On startup, PrintPasa seeds (or updates) a superuser account with a credential in `auth_accounts`. If `NUXT_SUPERUSER_PASSWORD` is not set, superuser login is unavailable.

The superuser user record uses:

- **ID**: value of `NUXT_SUPERUSER_USERNAME` (default `admin`)
- **Email**: `{username}@printpasa.local`
- **Role**: `superuser`

Only one superuser role is active; legacy superuser rows are demoted on seed.

## Logging In as Superuser

Sign in on the **login page** (`/login`) with the superuser email and password:

- **Email:** `{NUXT_SUPERUSER_USERNAME}@printpasa.local` (default `admin@printpasa.local`)
- **Password:** value of `NUXT_SUPERUSER_PASSWORD`

You can also use Google OAuth if configured, then promote the user to `role=superuser` in the database (not typical for seeded admin).

Failed attempts are recorded in audit logs (`auth.login_failed`).

### Session characteristics

Superuser sessions set `isSuperuser: true` on the user object. The header shows **Audit Logs** in navigation. Sign out returns you to the normal login flow.

## Viewing All Projects

On the dashboard, superusers fetch **every project** in the database, ordered by creation date (newest first).

Each card includes the same fields as regular users plus implicit owner data from the API (`ownerName`, `ownerEmail` available server-side; creator filter uses `originActor`).

Superusers can:

- Open any project and run workflow stages (subject to project ownership rules in the API—superuser bypass applies via `resolveWritableProjectById`)
- Edit, archive, or delete any project from the dashboard menu
- Filter by status, creator, and date like regular users

Use superuser access for support, auditing automated pipelines, and cleaning up orphaned projects.

## Audit Logs

Navigate to **Audit Logs** (`/audit-logs`)—only visible when logged in as superuser.

### What is logged

The audit trail captures system-wide events including:

| Category | Example actions |
|----------|-----------------|
| Authentication | `auth.login_succeeded`, `auth.login_failed` |
| Workflow runs | Stage generations, pipeline job lifecycle |
| Telegram / Cron | Bot commands, scheduled research triggers |
| Service | Internal API and automation events |

Each row shows:

- Timestamp
- Actor (`USER`, `SYSTEM`, `TELEGRAM`, `CRON`, `SERVICE`)
- Action code
- Target resource
- Level (`success`, `warning`, `error`)
- Truncated metadata preview

### Filtering logs

Use the filter panel to narrow results:

- **Search** — Free-text query across actions and metadata
- **Actor** — USER, SYSTEM, TELEGRAM, etc.
- **Action** — Specific action codes
- **Level** — success, warning, error
- **Project** — Events tied to a project ID (also linked from project Research page)

Click a row’s metadata preview to open the full JSON payload in a modal.

### Practical uses

- Investigate failed Telegram `/idea` pipeline runs
- Confirm who logged in via superuser password
- Trace a workflow run ID across stages
- Debug cron schedule executions

## Security Recommendations

- Use a strong, unique `NUXT_SUPERUSER_PASSWORD`—never commit it to version control.
- Restrict superuser login to trusted administrators.
- Rotate the password by updating the env var and restarting (seed rotates the hash automatically).
- Prefer Google OAuth for day-to-day users; reserve superuser for ops.
- Review audit logs periodically for unexpected `auth.login_failed` spikes.

## Auth Disabled Mode

When `NUXT_DISABLE_AUTH=true`, the app auto-logs in as a local bypass user with superuser role. Audit Logs remain available. This mode is for development only.

## Related Guides

- [Getting Started → Signing In](./getting-started.md#signing-in)
- [Telegram Bot](./telegram-bot.md)
- [Workflows → Origins](./workflows.md#origins-portal-telegram-cron)
