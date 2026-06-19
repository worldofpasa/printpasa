#!/usr/bin/env bash
set -euo pipefail

echo "Creating issue 1..."
gh issue create \
  --title "[Critical] Enable Resumable Pipeline Jobs in Operator Engine" \
  --label "enhancement" \
  --body "### Summary
Currently, the automated niche researcher runs a sequence of steps defined in \`server/services/pipeline/operator.ts\`. If any transient API error occurs (such as a 503 on Gemini, rate limits on Krea image generation, or a timeout uploading to S3), the job status is set to \`failed\` and it exits. 

There is no way to resume or retry a failed job. The system or user must restart the entire pipeline from scratch, which wastes API credits (re-generating themes and prompts) and discards curated/approved concepts.

### Proposed Solution
Modify \`runPipelineOperator\` to support resuming a job from its last successfully completed step:
1. When \`runPipelineOperator\` is invoked for a \`failed\` job, instead of returning early, check its \`currentStep\` database field.
2. In the execution flow, skip already-completed steps (e.g., if \`gather_idea\` and \`validate\` are already completed, skip directly to \`stage_prompts\` and \`prompts\` generation).
3. Introduce a Telegram command \`/job_resume <jobId>\` and a corresponding handler in \`commands.ts\` to allow admins to retry failed jobs."

echo "Creating issue 2..."
gh issue create \
  --title "[Bug] Background Removal S3 Upload Not Updating Image URL in Fulfillment Handoff" \
  --label "bug" \
  --body "### Summary
In \`server/api/workflow/[projectId]/products/create.post.ts\`, when creating a print product in Printify with background removal enabled:
1. The background removal provider is executed. If it runs locally (using \`@imgly/background-removal-node\`), it returns the image as a Base64 data URL (\`data:image/png;base64,...\`).
2. If S3 is configured, the buffer is uploaded to S3 and \`s3KeyBgRemoved\` is updated in the database.
3. However, \`uploadedImageUrl\` is **never updated** with the S3 URL.
4. As a result, the raw, massive Base64 data URL is passed directly to \`fulfillment.createProduct()\`.

### Rationale
Although Printify's upload endpoint has fallback code to parse Base64, passing a 5MB-10MB base64 string directly inside the payload causes severe gateway timeouts (e.g. 504 errors on serverless environments) and exhausts server memory.

### Proposed Solution
Modify \`create.post.ts\` inside the background removal loop:
\`\`\`typescript
if (isS3Configured() && imageBuffer) {
  try {
    const s3Key = await uploadImage(projectId, 'bg-removed', imageId, imageBuffer)
    await db.update(schema.generatedImages)
      .set({ s3KeyBgRemoved: s3Key })
      .where(eq(schema.generatedImages.id, imageId))
    
    // RESOLVE AND UPDATE UPLOADED IMAGE URL
    const { getImageUrl } = await import('~~/server/services/storage/s3')
    uploadedImageUrl = await getImageUrl(s3Key, 3600)
  } catch (s3Err) {
    console.error(\`S3 upload failed for bg-removed image \${imageId}:\`, s3Err)
  }
}
\`\`\`"

echo "Creating issue 3..."
gh issue create \
  --title "[Performance] Implement Concurrency-Limited Batch Queue in Stage 4 Image Generation" \
  --label "enhancement" \
  --body "### Summary
During Stage 4 (\`images_generate\`), the pipeline resolves all active prompts for winning themes and triggers generation. Currently, \`generate.post.ts\` runs all prompt generations concurrently using \`Promise.all(generatePromises)\`.

If a project has multiple prompts (e.g., 10-15 prompts), executing them concurrently will hit concurrent request rate limits of Fal (Flux) or Krea, causing a high rate of transient image generation failures.

### Proposed Solution
Implement a concurrency-limited batch scheduler (using a utility like \`p-limit\` or a simple chunking loop) to restrict concurrent API calls to 2 or 3 requests at a time, ensuring rate limit safety and significantly improving batch generation reliability."

echo "Creating issue 4..."
gh issue create \
  --title "[UX] Automated Printify Shop Discovery & Settings Integration" \
  --label "enhancement" \
  --body "### Summary
The Printify provider requires a \`printifyShopId\` to upload images and create listings. Currently, users must manually locate and type their \`printifyShopId\` inside settings. If they don't, or enter it incorrectly, listing creation fails.

### Proposed Solution
Add a settings endpoint \`/api/settings/fulfillment/printify-shops\` that queries Printify's \`/shops.json\` API using the user's validated \`printifyApiKey\`. If the shop ID is not configured but a key is present, automatically discover the first shop and save it to the user's settings, significantly simplifying onboarding."

echo "Creating issue 5..."
gh issue create \
  --title "[Robustness] S3 CORS Policy Validator and Self-Diagnostic Utility" \
  --label "enhancement" \
  --body "### Summary
Stage 5 (Mockups Editor) loads S3 images using HTML \`<img crossOrigin=\"anonymous\">\` to allow client-side canvas manipulation. This fails in browsers if the S3 bucket's CORS headers are not configured with the correct origins. Currently, there is no system diagnostic to alert users about misconfigured CORS policies, leading to silent UI breakages.

### Proposed Solution
Create a diagnostic route (\`/api/settings/storage/diagnose-cors\`) that performs a preflight check (or attempts to fetch headers) or provides a single-click \"Verify & Setup S3 Bucket CORS\" button in the admin settings dashboard to automatically check S3 CORS configuration."

echo "All GitHub issues created successfully!"
