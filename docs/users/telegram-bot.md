# Telegram Bot

PrintPasa can accept pipeline commands through a Telegram bot—useful for kicking off idea research and managing scheduled discovery jobs from mobile or team channels.

## Prerequisites

Configure these environment variables on the server:

| Variable | Purpose |
|----------|---------|
| `NUXT_TELEGRAM_BOT_TOKEN` | Bot token from [@BotFather](https://t.me/BotFather) |
| `NUXT_TELEGRAM_WEBHOOK_SECRET` | Optional secret validated on webhook requests |
| `NUXT_TELEGRAM_ALLOWED_CHAT_IDS` | Comma-separated chat IDs allowed to use the bot (empty = allow all) |
| `NUXT_SERVICE_TOKEN` | Internal auth for pipeline API calls |
| `NUXT_PIPELINE_OWNER_USER_ID` | User ID that owns Telegram-created projects |

Also required for full pipeline execution: AI keys, `NUXT_PUBLIC_APP_URL`, and other pipeline defaults documented in the README.

### Webhook setup

Point Telegram’s webhook to your deployed instance:

```
POST https://your-domain.com/api/integrations/telegram/webhook
```

Include header `X-Telegram-Bot-Api-Secret-Token` if `NUXT_TELEGRAM_WEBHOOK_SECRET` is set.

## Security

- When `NUXT_TELEGRAM_ALLOWED_CHAT_IDS` is set, messages from other chats are silently ignored.
- Webhook secret prevents unauthorized POSTs to your endpoint.
- Pipeline jobs run under `NUXT_PIPELINE_OWNER_USER_ID`—projects appear on that user’s dashboard (visible to superusers across all accounts).

## /idea Command

Start an automated pipeline from a free-text product idea.

### Usage

```
/idea your product idea here
```

### Example

```
/idea ultimate packing list - diaper bag
```

### What happens

1. Bot parses the idea text after `/idea`.
2. A pipeline job is queued with source `telegram`.
3. Bot replies with confirmation: project name and job ID.
4. Background worker runs research and workflow stages using pipeline defaults.
5. Progress and completion notifications are sent back to the chat (when notify hooks are configured).

### Invalid usage

Sending `/idea` without text returns:

```
Usage: /idea your product idea
Example: /idea ultimate packing list - diaper bag
```

### Project naming

The project name is derived automatically from the idea text (truncated/slugified for readability).

## Schedule Commands

Manage automated topic-discovery schedules from Telegram.

### List commands

| Command | Description |
|---------|-------------|
| `/schedule` | Show help for all schedule commands |
| `/schedules` | List all schedules with status, interval, niche, last/next run |

### Manage schedules

| Command | Description |
|---------|-------------|
| `/schedule_add "Name" <hourly\|daily\|weekly> [niche]` | Create a new schedule |
| `/schedule_remove <id>` | Delete a schedule |
| `/schedule_enable <id>` | Enable a schedule |
| `/schedule_disable <id>` | Disable a schedule |
| `/schedule_trigger <id>` | Run a schedule immediately |

### Examples

Create a daily gaming trends schedule:

```
/schedule_add "Gaming Trends" daily gaming
```

Trigger an existing schedule now:

```
/schedule_trigger a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

List schedules to find IDs:

```
/schedules
```

### Schedule fields

Each schedule stores:

- **Name** — Human-readable label
- **Interval** — `hourly`, `daily`, or `weekly`
- **Niche** — Target niche slug (default: `holiday`)
- **Source** — Trend signal source (default: `reddit`)
- **Enabled** — Whether cron picks it up
- **Last / next run** — Timestamps

Schedules created via Telegram also appear in **Settings → Schedules** in the web UI.

### Trigger output

`/schedule_trigger` runs automated research immediately and replies with:

- Schedule name
- Discovery mode
- Seed count
- Workflow run ID (for audit correlation)

Failures reply with an error message in chat.

## Relating Chat Jobs to the Dashboard

Telegram-created projects have:

- `originSource`: `telegram`
- `originActor`: Telegram username or first name

Filter the dashboard by **Creator → Telegram** to find them. Superusers see all users’ Telegram projects.

## Troubleshooting

| Issue | Check |
|-------|-------|
| Bot does not respond | Webhook URL, bot token, server reachable |
| Messages ignored | Chat ID in `NUXT_TELEGRAM_ALLOWED_CHAT_IDS` |
| 401 on webhook | `NUXT_TELEGRAM_WEBHOOK_SECRET` mismatch |
| Pipeline fails silently | Audit logs, `NUXT_SERVICE_TOKEN`, AI keys |
| Projects missing on dashboard | `NUXT_PIPELINE_OWNER_USER_ID` resolves to valid user |

See [Troubleshooting](./troubleshooting.md) and [Superuser → Audit Logs](./superuser.md#audit-logs).

## Related Guides

- [Settings → Schedules](./settings.md#schedules-additional-tab)
- [Workflows → Origins](./workflows.md#origins-portal-telegram-cron)
- [Getting Started](./getting-started.md)
