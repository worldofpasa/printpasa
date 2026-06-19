import { eq, and } from 'drizzle-orm'
import { useDB, schema } from '~~/server/database'
import { deleteImage, isS3Configured } from '~~/server/services/storage/s3'
import { resolveVariationForUser, clearQuickRefIfMatches } from './_util'

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'projectId')!
  const imageId = getRouterParam(event, 'imageId')!
  const variationId = getRouterParam(event, 'variationId')!

  const { variation } = await resolveVariationForUser(event, projectId, imageId, variationId)

  if (variation.s3Key && isS3Configured()) {
    try {
      await deleteImage(variation.s3Key)
    } catch (e) {
      console.error(`S3 delete failed for variation ${variationId}:`, e)
    }
  }

  await clearQuickRefIfMatches(imageId, { kind: variation.kind, s3Key: variation.s3Key, url: variation.url })

  const db = useDB()
  // Clear the selected_variation_id pointer if it referenced this row.
  await db.update(schema.generatedImages)
    .set({ selectedVariationId: null })
    .where(and(eq(schema.generatedImages.id, imageId), eq(schema.generatedImages.selectedVariationId, variationId)))

  await db.delete(schema.imageVariations).where(eq(schema.imageVariations.id, variationId))

  return { ok: true }
})
