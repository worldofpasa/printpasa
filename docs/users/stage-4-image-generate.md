# Stage 4: Image Generate

**Image Generate** creates design images from your selected prompts using your configured image provider (Krea, Fal, or others enabled in Settings).

## Goal

Produce **selected generated images** ready for background removal and upscaling in Stage 5.

---

## ⚠️ Destructive Regeneration Warning

**Batch generation and full re-runs replace existing active images.**

When you generate images:

- **Batch generate** (all selected prompts): All active images for winner-theme prompts are **superseded** before new images are created
- **Per-prompt generate**: Only images for that specific prompt are superseded
- **Regenerate single card**: Replaces that one image; previous version is superseded

Superseded images disappear from the active workflow. S3-stored files may remain on storage but are no longer linked in the project UI.

**Before regenerating:**

1. Download or note URLs for images you want to keep
2. [Fork the project](./workflows.md#forking-a-project) if you want to preserve the current image set while experimenting
3. Understand that Stage 5 and 6 reference active images only—superseded images break downstream selections

Stage 3 supersedes prompts; Stage 4 supersedes images. Both are lossy operations.

---

## Before You Start

- Complete Stage 3 with at least one selected prompt.
- Configure an image provider and API key in **Settings → Defaults** or **Providers**.
- S3 storage should be configured for production use (`NUXT_S3_*` variables)—images upload to S3 after generation.

## Step-by-Step

### 1. Choose provider and model

Select the **image provider** and **model** for batch generation. Available options depend on your Settings registry and enabled models.

Per-prompt overrides are available—expand a prompt row to assign a different provider or model for that prompt only.

### 2. Generate images

**Generate all** runs every selected prompt through the image provider. Progress appears per theme group:

- Pending prompts show a loading state
- Completed images appear as cards with thumbnails
- Failed generations show error messages with retry options

Generation may take several minutes for large batches (polling-based providers wait for job completion).

### 3. Review images

For each image card:

- **Click to preview** full size
- **Toggle selection** — Selected images proceed to Stage 5
- **Edit prompt** — Modify the prompt text and regenerate that card only
- **Regenerate** — Replace this single image (supersedes the current one)

Images are grouped by theme. Expand or collapse theme sections for easier review.

### 4. Handle failures

Failed cards display the provider error. Common causes:

- Invalid or expired API key
- Rate limits or quota exhaustion
- Prompt content rejected by provider safety filters
- Timeout on slow jobs

Fix the underlying issue, then use **Regenerate** on failed cards or re-run batch generation.

### 5. Continue

Select at least one successful image, then click **Continue to Image Optimization**.

## Advancement Requirements

| Requirement | Detail |
|-------------|--------|
| Selected images | At least one generated image with `isSelected` true |

## Storage Notes

- New images upload to S3 immediately when storage is configured; `imageUrl` is a short-lived presigned URL refreshed on load.
- Legacy projects may show provider URLs until migrated via Stage 5’s **Migrate originals to S3** action.

## Tips

- Start with one prompt per theme to validate style before batch-generating the rest.
- Match model to design lane (typography vs. illustration models may differ).
- Per-prompt provider overrides help A/B test different models without changing global defaults.
- Do not regenerate the entire batch casually—you will lose your current image set.

## Related Guides

- [Stage 5: Image Optimization](./stage-5-image-optimization.md)
- [Stage 3: Image Prompts](./stage-3-image-prompts.md)
- [Troubleshooting → S3 and failed generations](./troubleshooting.md)
