# Stage 5: Image Optimization

**Image Optimization** prepares selected images for print and product placement by removing backgrounds and upscaling to print-ready resolution.

## Goal

Produce clean, high-resolution design assets with transparent (or solid) backgrounds suitable for the Stage 6 placement editor.

## Before You Start

- Complete Stage 4 with at least one selected image.
- Configure **background removal** and **upscale** providers in **Settings → Defaults**.
- Ensure S3 is configured—optimization outputs are stored as S3 variants (`bg-removed`, `upscaled`).

## Step-by-Step

### 1. Review selected images

Images you selected in Stage 4 appear in a grid grouped by theme. Each row shows:

- Original generated image
- Background removal status and result
- Upscale status and result
- Any error messages from failed processing steps

### 2. Run background removal

For each image (or in batch where supported), run **Remove background**. The app sends the image to your configured provider:

- **Local background removal** — In-process fallback, no external API
- **PhotoRoom, Bria, Leonardo**, etc. — External APIs when configured

Successful runs store a background-removed variant in S3 and display a preview.

### 3. Run upscale

Run **Upscale** on images that need higher resolution for print. Upscaled variants are stored separately and linked on the image record.

You can upscale before or after background removal depending on provider recommendations; the UI tracks both variants.

### 4. Select the active variant

When multiple variants exist (original, bg-removed, upscaled), choose which variant Stage 6 should use via the **selection** control. The preferred order is typically:

1. Upscaled + bg-removed (if both exist)
2. Background-removed only
3. Original (fallback)

### 5. Open the image editor (optional)

Click **Edit** to open the placement-oriented editor:

- Preview variants side by side
- Fine-tune which asset proceeds to product placement
- Adjust crop or positioning metadata where supported

The editor loads images with `crossOrigin="anonymous"`—S3 CORS must allow your app origin (see [Troubleshooting](./troubleshooting.md#s3-cors-errors-in-the-editor)).

### 6. Migrate legacy originals (if shown)

Projects created before S3 storage may show a **Migrate originals to S3** banner. Run migration to upload provider-hosted URLs to your bucket so optimization and the editor work reliably.

### 7. Continue

Stage 5 is a **pass-through** stage for advancement—you can continue once Stage 4 selections exist. Complete optimization on the images you plan to place on products before Stage 6 for best results.

Click **Continue to Product Placement**.

## Advancement Requirements

| Requirement | Detail |
|-------------|--------|
| Stage gate | Automatically satisfied if Stage 4 had selections; optimization itself is not gated |

Best practice: finish bg-removal and upscale on every image you will productize.

## Processing Errors

| Error | Likely cause |
|-------|----------------|
| Background removal failed | Missing `PHOTOROOM_API_KEY` or provider misconfiguration |
| Upscale failed | Upscale provider key missing or image too large |
| Editor blank / CORS error | S3 bucket missing CORS policy for your app URL |
| Legacy URL expired | Run S3 backfill migration |

## Tips

- Process images in parallel where the UI allows batch actions to save time.
- Transparent PNGs work best on dark and light shirt mockups in Stage 6.
- Re-running bg-removal or upscale on an image replaces that variant—less destructive than Stage 3/4 full regen, but previous variant URLs may be superseded.

## Related Guides

- [Stage 6: Product Placement](./stage-6-product-placement.md)
- [Settings → Defaults](./settings.md#default-providers)
- [Troubleshooting → S3 CORS](./troubleshooting.md#s3-cors-errors-in-the-editor)
