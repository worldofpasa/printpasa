import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import sharp from 'sharp'
import { useDB, schema } from '~~/server/database'
import { requireUser } from '~~/server/utils/auth'
import { resolveWritableProjectById } from '~~/server/utils/resolveProject'
import type { ImageStage } from '~~/server/services/storage/s3'

export type VariationKind = 'bg-removed' | 'upscaled' | 'edited' | 'composite' | 'traced'

export async function resolveImageForUser(event: H3Event, projectId: string, imageId: string) {
  const user = await requireUser(event)
  const project = await resolveWritableProjectById(user, projectId)
  const db = useDB()

  const image = await db.query.generatedImages.findFirst({
    where: eq(schema.generatedImages.id, imageId),
  })
  if (!image) {
    throw createError({ statusCode: 404, statusMessage: 'Image not found' })
  }

  // Verify the image belongs to the project via prompt → theme → project chain.
  const prompt = await db.query.imagePrompts.findFirst({
    where: eq(schema.imagePrompts.id, image.promptId),
  })
  if (!prompt) {
    throw createError({ statusCode: 404, statusMessage: 'Image prompt not found' })
  }
  const theme = await db.query.themes.findFirst({
    where: eq(schema.themes.id, prompt.themeId),
  })
  if (!theme || theme.projectId !== project.id) {
    throw createError({ statusCode: 404, statusMessage: 'Image not in project' })
  }

  return { user, project, image, theme, prompt }
}

export async function resolveVariationForUser(
  event: H3Event,
  projectId: string,
  imageId: string,
  variationId: string,
) {
  const ctx = await resolveImageForUser(event, projectId, imageId)
  const db = useDB()
  const variation = await db.query.imageVariations.findFirst({
    where: eq(schema.imageVariations.id, variationId),
  })
  if (!variation || variation.imageId !== imageId) {
    throw createError({ statusCode: 404, statusMessage: 'Variation not found' })
  }
  return { ...ctx, variation }
}

/**
 * Decode a data URL or bare base64 payload into a Buffer.
 * Throws 400 if the payload is empty or invalid.
 */
export function decodeBlob(payload: string): Buffer {
  if (!payload) throw createError({ statusCode: 400, statusMessage: 'blob is required' })
  const base64 = payload.startsWith('data:') ? (payload.split(',')[1] ?? '') : payload
  if (!base64) throw createError({ statusCode: 400, statusMessage: 'blob payload is empty' })
  try {
    return Buffer.from(base64, 'base64')
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'blob is not valid base64' })
  }
}

export async function extractDimensions(buf: Buffer, format: 'png' | 'svg') {
  const fileSize = buf.byteLength
  if (format === 'svg') {
    return { width: null as number | null, height: null as number | null, fileSize, mimeType: 'image/svg+xml' }
  }
  try {
    const meta = await sharp(buf).metadata()
    return {
      width: meta.width ?? null,
      height: meta.height ?? null,
      fileSize,
      mimeType: meta.format ? `image/${meta.format}` : 'image/png',
    }
  } catch {
    return { width: null, height: null, fileSize, mimeType: 'image/png' }
  }
}

export function stageForKind(kind: VariationKind): ImageStage {
  if (kind === 'bg-removed') return 'bg-removed'
  if (kind === 'upscaled') return 'upscaled'
  return 'variation'
}

export function extForFormat(format: 'png' | 'svg'): string {
  return format === 'svg' ? 'svg' : 'png'
}

export function contentTypeForFormat(format: 'png' | 'svg'): string {
  return format === 'svg' ? 'image/svg+xml' : 'image/png'
}

/**
 * Mirror the newly-saved variation to the legacy quick-ref columns on
 * generated_images when kind is bg-removed or upscaled, so existing
 * stage-5/stage-6 consumers keep working until the editor replaces them.
 */
export async function syncQuickRefColumn(
  imageId: string,
  variation: { kind: string; url: string; s3Key: string | null },
) {
  const db = useDB()
  if (variation.kind === 'bg-removed') {
    await db.update(schema.generatedImages)
      .set({
        bgRemovedUrl: variation.url,
        s3KeyBgRemoved: variation.s3Key ?? null,
        bgRemovalStatus: 'completed',
        bgRemovalError: null,
      })
      .where(eq(schema.generatedImages.id, imageId))
  } else if (variation.kind === 'upscaled') {
    await db.update(schema.generatedImages)
      .set({
        upscaledUrl: variation.url,
        s3KeyUpscaled: variation.s3Key ?? null,
        upscaleStatus: 'completed',
        upscaleError: null,
      })
      .where(eq(schema.generatedImages.id, imageId))
  }
}

/**
 * Clear the legacy quick-ref columns if they were pointing at this variation.
 * Called on delete.
 */
export async function clearQuickRefIfMatches(
  imageId: string,
  variation: { kind: string; s3Key: string | null; url: string },
) {
  const db = useDB()
  const image = await db.query.generatedImages.findFirst({
    where: eq(schema.generatedImages.id, imageId),
  })
  if (!image) return
  if (variation.kind === 'bg-removed' && (image.s3KeyBgRemoved === variation.s3Key || image.bgRemovedUrl === variation.url)) {
    await db.update(schema.generatedImages)
      .set({ bgRemovedUrl: null, s3KeyBgRemoved: null, bgRemovalStatus: null })
      .where(eq(schema.generatedImages.id, imageId))
  } else if (variation.kind === 'upscaled' && (image.s3KeyUpscaled === variation.s3Key || image.upscaledUrl === variation.url)) {
    await db.update(schema.generatedImages)
      .set({ upscaledUrl: null, s3KeyUpscaled: null, upscaleStatus: null })
      .where(eq(schema.generatedImages.id, imageId))
  }
}
