import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export type ImageStage = 'generated' | 'selected' | 'upscaled' | 'bg-removed' | 'variation'

let _client: S3Client | null = null

function getClient(): S3Client {
  if (!_client) {
    const config = useRuntimeConfig()
    _client = new S3Client({
      region: config.s3Region || 'us-east-2',
      credentials: {
        accessKeyId: config.s3AccessKeyId,
        secretAccessKey: config.s3SecretAccessKey,
      },
      // Suppress x-amz-checksum-mode=ENABLED on presigned GETs.
      // Default 'WHEN_SUPPORTED' adds the param, which triggers a CORS preflight
      // that fails in browsers loading <img crossOrigin="anonymous">.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
      ...(config.s3Endpoint ? { endpoint: config.s3Endpoint, forcePathStyle: true } : {}),
    })
  }
  return _client
}

function getBucket(): string {
  return useRuntimeConfig().s3Bucket
}

/**
 * S3 key structure:
 *   projects/{projectSlug}/{stage}/{themeSlug}_{timestamp}.png
 *
 * Examples:
 *   projects/vibes-collection/generated/syntax-sorcerer_1708653600123.png
 *   projects/vibes-collection/upscaled/syntax-sorcerer_1708653600123_upscaled.png
 *   projects/vibes-collection/bg-removed/syntax-sorcerer_1708653600123_nobg.png
 *
 * For images that are both upscaled AND bg-removed:
 *   projects/vibes-collection/bg-removed/syntax-sorcerer_1708653600123_upscaled_nobg.png
 */
function buildKey(
  projectSlug: string,
  stage: ImageStage,
  filename: string,
  ext = 'png',
): string {
  return `projects/${projectSlug}/${stage}/${filename}.${ext}`
}

/**
 * Generate a unique filename from a theme slug + timestamp.
 * If a counter is provided (> 0), appends it to handle collisions.
 */
export function buildImageFilename(themeSlug: string, counter = 0): string {
  const ts = Date.now()
  return counter > 0 ? `${themeSlug}_${ts}_${counter}` : `${themeSlug}_${ts}`
}

/**
 * Derive the upscaled filename from an original base filename.
 * E.g. "syntax-sorcerer_1708653600123" → "syntax-sorcerer_1708653600123_upscaled"
 */
export function appendUpscaledSuffix(baseFilename: string): string {
  return `${baseFilename}_upscaled`
}

/**
 * Derive the no-background filename from an original base filename.
 * E.g. "syntax-sorcerer_1708653600123" → "syntax-sorcerer_1708653600123_nobg"
 *      "syntax-sorcerer_1708653600123_upscaled" → "syntax-sorcerer_1708653600123_upscaled_nobg"
 */
export function appendNobgSuffix(baseFilename: string): string {
  return `${baseFilename}_nobg`
}

/**
 * Extract the base filename (without extension) from an S3 key.
 * E.g. "projects/my-proj/generated/syntax-sorcerer_1708653600123.png" → "syntax-sorcerer_1708653600123"
 */
export function extractBaseFilename(s3Key: string): string {
  const last = s3Key.split('/').pop() ?? ''
  return last.replace(/\.[^.]+$/, '')
}

/**
 * Upload an image buffer to S3.
 * Returns the S3 key (not a URL — use getImageUrl to get a signed URL).
 */
export async function uploadImage(
  projectSlug: string,
  stage: ImageStage,
  filename: string,
  buffer: Buffer,
  contentType = 'image/png',
): Promise<string> {
  const key = buildKey(projectSlug, stage, filename)
  await getClient().send(new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }))
  return key
}

/**
 * Upload to an explicit S3 key (overwrite in place). Used when preserving the
 * key matters — e.g. variation overwrite keeps the row's s3Key stable.
 */
export async function uploadImageAtKey(
  key: string,
  buffer: Buffer,
  contentType = 'image/png',
): Promise<string> {
  await getClient().send(new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }))
  return key
}

/**
 * Get a pre-signed URL for reading an image from S3.
 * Default expiry: 1 hour. For longer-lived URLs, increase expiresIn.
 */
export async function getImageUrl(key: string, expiresIn = 3600): Promise<string> {
  const url = await getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: getBucket(), Key: key }),
    { expiresIn },
  )
  return url
}

/**
 * Delete an image from S3.
 */
export async function deleteImage(key: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({
    Bucket: getBucket(),
    Key: key,
  }))
}

/**
 * Check if S3 is configured (all required env vars present).
 */
export function isS3Configured(): boolean {
  const config = useRuntimeConfig()
  return !!(config.s3AccessKeyId && config.s3SecretAccessKey && config.s3Bucket)
}
