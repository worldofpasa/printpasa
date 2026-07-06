# Troubleshooting

Solutions for common PrintPasa errors: missing API keys, S3/CORS issues, and failed AI or image generations.

## Missing or Invalid API Keys

### Symptoms

- Red highlighted provider fields in **Settings → Defaults**
- “Provider not configured” or 401/403 errors when generating
- Empty provider dropdowns
- Stage actions fail immediately with server error messages

### Fix

1. Verify environment variables on the server (restart after changes):

   | Capability | Example variables |
   |------------|-------------------|
   | AI text | `NUXT_GEMINI_API_KEY`, `NUXT_OPENAI_API_KEY`, `NUXT_ANTHROPIC_API_KEY` |
   | Image gen | `NUXT_KREA_API_KEY`, `NUXT_FAL_API_KEY` |
   | Background removal | `NUXT_PHOTOROOM_API_KEY`, `NUXT_DEFAULT_BACKGROUND_REMOVAL_PROVIDER` |
   | Fulfillment | `NUXT_PRINTIFY_API_KEY` |
   | Search (Stage 1) | `NUXT_SERPER_API_KEY`, `NUXT_SEARCHAPI_API_KEY`, `NUXT_SERPAPI_API_KEY` |
   | S3 storage | `NUXT_S3_ACCESS_KEY_ID`, `NUXT_S3_SECRET_ACCESS_KEY`, `NUXT_S3_BUCKET`, `NUXT_S3_REGION` |

2. Open **Settings → Providers** and confirm the provider is **enabled** with at least one enabled model.

3. Open **Settings → Registry** and confirm the provider row is enabled with the correct `envVarName`.

4. For user-specific keys (search APIs), enter values in **Settings → Defaults** and click **Save**.

5. Re-run the failed stage action.

### Session / auth errors

- `NUXT_SESSION_PASSWORD` must be at least 32 characters.
- OAuth errors: verify `NUXT_OAUTH_GOOGLE_CLIENT_ID` and `NUXT_OAUTH_GOOGLE_CLIENT_SECRET` match your Google Cloud console redirect URIs.

---

## S3 CORS Errors in the Editor

### Symptoms

- Stage 5 or Stage 6 placement editor shows blank image area
- Browser console: CORS policy blocked, `NetworkError`, or failed presigned GET
- Images load in `<img>` tags on list views but fail in canvas/editor with `crossOrigin="anonymous"`

### Cause

The S3 bucket (or S3-compatible endpoint) must allow cross-origin GET requests from your app’s origin. Presigned URLs may also include checksum query params—PrintPasa configures the SDK to avoid unnecessary checksum headers on reads.

### Fix

Add a CORS policy on your bucket allowing your dev and production origins:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://your-production-domain.com"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

For AWS CLI:

```bash
aws s3api put-bucket-cors \
  --bucket YOUR_BUCKET_NAME \
  --cors-configuration file://cors.json
```

Replace origins with your actual URLs. If using `NUXT_S3_ENDPOINT` (R2, MinIO), apply the equivalent CORS config in that service’s dashboard.

### Verify

1. Open browser devtools → Network tab.
2. Load the stage editor and inspect the presigned image request.
3. Confirm response headers include `Access-Control-Allow-Origin` matching your app URL.

---

## S3 Upload or Storage Failures

### Symptoms

- Stage 4 images show provider URLs but never persist
- “S3 not configured” warnings
- Backfill migration fails

### Fix

1. Set all `NUXT_S3_*` variables including bucket and region.
2. Confirm IAM credentials allow `PutObject` and `GetObject` on the bucket prefix.
3. Run **Migrate originals to S3** in Stage 5 for legacy projects.
4. Optional: set `NUXT_S3_ENDPOINT` for S3-compatible hosts.

---

## Failed AI or Image Generations

### Text generation (Stages 1–3)

| Error pattern | Likely cause | Action |
|---------------|--------------|--------|
| 401 / 403 | Invalid API key | Rotate key in env, restart server |
| 429 | Rate limit | Wait and retry; reduce theme/prompt counts |
| JSON parse error | Model returned invalid JSON | Retry; try different model in Settings |
| Timeout | Long research + generation | Retry; check network; reduce batch size |
| Empty themes/prompts | Model refusal or bad prompt | Revise product idea text; lower temperature via provider config |

### Image generation (Stage 4)

| Error pattern | Likely cause | Action |
|---------------|--------------|--------|
| Job pending forever | Polling provider slow/down | Wait; check provider status page |
| Safety filter | Prompt flagged | Edit prompt in Stage 3 or 4; regenerate |
| Wrong dimensions | Model default size | Switch model in provider settings |
| Partial batch failure | Per-prompt errors | Regenerate failed cards individually |

### Background removal / upscale (Stage 5)

| Error pattern | Likely cause | Action |
|---------------|--------------|--------|
| PhotoRoom error | Missing/invalid `PHOTOROOM_API_KEY` | Set key; use `local-bg` provider as fallback |
| Upscale failed | Provider quota or size limit | Try smaller source image or different upscale provider |

### General retry strategy

1. Read the inline error message on the failed card or alert dialog.
2. Check **Audit Logs** (superuser) for the workflow run ID and metadata.
3. Fix configuration—do not repeatedly click regenerate without changes.
4. [Fork the project](./workflows.md#forking-a-project) before destructive retries in Stages 3–4.

---

## Fulfillment Provider Errors

### Symptoms

- Stage 6 product creation fails
- Stage 7 publish returns failed status
- Missing mockups

### Fix

1. Verify `NUXT_PRINTIFY_API_KEY` (or your provider key).
2. Confirm the provider shop/store is connected in the provider’s dashboard.
3. Ensure catalog blueprints in **Settings → Catalog** are valid and enabled.
4. Check SKU conflicts—forked projects append hash suffixes; duplicates against live store listings may fail.
5. Retry publish from Stage 7 **Drafts** tab for individual products.

---

## Telegram Bot Issues

| Symptom | Fix |
|---------|-----|
| No response | Verify webhook URL and `NUXT_TELEGRAM_BOT_TOKEN` |
| 401 webhook | Match `NUXT_TELEGRAM_WEBHOOK_SECRET` header |
| Ignored messages | Add chat ID to `NUXT_TELEGRAM_ALLOWED_CHAT_IDS` |
| Pipeline never creates project | Set `NUXT_PIPELINE_OWNER_USER_ID` to a valid user ID |
| Job fails | Check `NUXT_SERVICE_TOKEN`, AI keys, and audit logs |

See [Telegram Bot](./telegram-bot.md).

---

## Database and Deployment

### Schema errors after upgrade

Run migrations against your database:

```bash
pnpm db:push        # development
pnpm db:migrate     # production with migration files
```

### Turso / remote DB connection failed

Verify `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in production environment.

### Auth disabled accidentally in production

Remove `NUXT_DISABLE_AUTH` or set it to `false`. All requests otherwise run as the local bypass superuser.

---

## Still Stuck?

1. Reproduce the error once with browser devtools open (Console + Network).
2. Check server logs for the corresponding request ID or stack trace.
3. Review [FAQ](./faq.md) and stage-specific docs for destructive regen caveats.
4. File an issue in the project repository with logs, stage, and redacted config (never paste API keys).

## Related Guides

- [Settings](./settings.md)
- [Stage 3: Image Prompts](./stage-3-image-prompts.md)
- [Stage 4: Image Generate](./stage-4-image-generate.md)
- [Superuser → Audit Logs](./superuser.md#audit-logs)
