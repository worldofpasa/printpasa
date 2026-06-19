import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDB, schema } from '~~/server/database'
import { resolveImageForUser } from './variations/_util'

const bodySchema = z.object({
  variationId: z.string().nullable(),
})

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'projectId')!
  const imageId = getRouterParam(event, 'imageId')!
  const body = await readValidatedBody(event, bodySchema.parse)

  await resolveImageForUser(event, projectId, imageId)
  const db = useDB()

  if (body.variationId) {
    const v = await db.query.imageVariations.findFirst({
      where: eq(schema.imageVariations.id, body.variationId),
    })
    if (!v || v.imageId !== imageId) {
      throw createError({ statusCode: 404, statusMessage: 'Variation not found for this image' })
    }
  }

  await db.update(schema.generatedImages)
    .set({ selectedVariationId: body.variationId })
    .where(eq(schema.generatedImages.id, imageId))

  return { ok: true, selectedVariationId: body.variationId }
})
