# Storage

Generated images are uploaded to **S3-compatible object storage** at generation time. The database stores S3 keys; API responses return **presigned GET URLs** (default 1-hour expiry).

Implementation: `server/services/storage/s3.ts`

---

## Why S3?

- Provider-hosted image URLs expire or rate-limit.
- Stage 5 (Product Placement) and the Konva editor load images with `crossOrigin="anonymous"` — you control CORS on your bucket.
- Upscaled and background-removed variants stay co-located with originals.

If S3 is not configured (`isS3Configured()` returns false), the app may retain provider URLs temporarily, but production deployments should always configure storage.

---

## Environment variables

```env
NUXT_S3_ACCESS_KEY_ID=AKIA...
NUXT_S3_SECRET_ACCESS_KEY=...
NUXT_S3_BUCKET=your-bucket-name
NUXT_S3_REGION=us-east-2
# Optional — for R2, MinIO, etc.
NUXT_S3_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
```

When `NUXT_S3_ENDPOINT` is set, the client uses **path-style** URLs (`forcePathStyle: true`).

---

## Key structure

```
projects/{projectSlug}/{stage}/{filename}.png
```

| Stage folder | When written |
|--------------|--------------|
| `generated` | Stage 4 image generation |
| `selected` | User selection copies (if applicable) |
| `upscaled` | Stage 5 upscale |
| `bg-removed` | Stage 5 background removal |
| `variation` | Editor trace/variation saves |

Filename format: `{themeSlug}_{timestamp}` with optional suffixes `_upscaled`, `_nobg`, or counter `_1`.

Example:

```
projects/summer-vibes/generated/syntax-sorcerer_1708653600123.png
projects/summer-vibes/bg-removed/syntax-sorcerer_1708653600123_nobg.png
```

Database columns on `generated_images`:

| Column | Content |
|--------|---------|
| `s3KeyGenerated` | Original generated image |
| `s3KeyUpscaled` | Upscaled variant |
| `s3KeyBgRemoved` | Background-removed variant |
| `imageUrl` | Refreshed presigned URL (not durable) |

---

## AWS S3 setup

### 1. Create a bucket

- Choose a region (default in PrintPasa: `us-east-2`).
- Block public access (objects served via presigned URLs only).
- Enable versioning optionally for disaster recovery.

### 2. IAM policy

Create an IAM user or role with minimal permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

### 3. CORS policy (required)

Stage 5 loads images in the browser with `crossOrigin="anonymous"`. Without CORS, the Konva editor shows a warning and editing/export is disabled.

Apply this bucket CORS configuration (replace origins with yours):

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:3456",
      "https://your-app.example.com",
      "https://demo.printpasa-demo.pages.dev"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

AWS CLI example:

```bash
aws s3api put-bucket-cors \
  --bucket your-bucket-name \
  --cors-configuration file://cors.json
```

### Checksum note

AWS SDK ≥3.729 may inject `x-amz-checksum-mode=ENABLED` into presigned URLs, triggering CORS preflights that fail in browsers. PrintPasa configures:

```typescript
requestChecksumCalculation: 'WHEN_REQUIRED',
responseChecksumValidation: 'WHEN_REQUIRED',
```

This suppresses the extra parameter on read-only GETs.

---

## Cloudflare R2

R2 is S3-compatible. Configure:

```env
NUXT_S3_ACCESS_KEY_ID=your-r2-access-key-id
NUXT_S3_SECRET_ACCESS_KEY=your-r2-secret-access-key
NUXT_S3_BUCKET=printpasa-images
NUXT_S3_REGION=auto
NUXT_S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
```

Create R2 API tokens with **Object Read & Write** on the target bucket. Apply the same CORS policy in the R2 bucket settings dashboard.

Benefits: no egress fees to Cloudflare Workers/Pages, lower cost at scale.

---

## MinIO (self-hosted)

For local or on-prem S3-compatible storage:

```env
NUXT_S3_ENDPOINT=http://localhost:9000
NUXT_S3_ACCESS_KEY_ID=minioadmin
NUXT_S3_SECRET_ACCESS_KEY=minioadmin
NUXT_S3_BUCKET=printpasa
NUXT_S3_REGION=us-east-1
```

Run MinIO with a bucket created via `mc mb`. Configure CORS via MinIO console or `mc anonymous` policies as needed.

---

## Legacy migration

Rows created before S3 integration may have `s3KeyGenerated = null` and a provider `imageUrl`. Migrate them:

```http
POST /api/workflow/{projectId}/images/backfill-s3
Authorization: Session cookie or x-service-token
```

This downloads provider URLs and re-uploads to your configured bucket.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Images load in `<img>` but editor says CORS error | Add your origin to bucket CORS `AllowedOrigins` |
| Presigned URL 403 | Check IAM permissions and bucket region |
| Upload fails silently | Verify all three required vars: access key, secret, bucket |
| R2 path-style errors | Ensure `NUXT_S3_ENDPOINT` is set (enables `forcePathStyle`) |

The UI surfaces CORS issues in Stage 5 via `useImageEditor.ts` — look for the amber banner in the image editor.

---

## Related docs

- [Architecture → Image storage flow](./architecture.md#image-storage-flow)
- [Configuration → Storage](./configuration.md#storage-s3)
- [API Reference → Images backfill](./api-reference.md#workflow--images)
