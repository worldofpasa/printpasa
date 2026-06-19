import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDB, schema } from '~~/server/database'
import { resolveVariationForUser } from './_util'

const bodySchema = z.object({
  name: z.string().trim().min(1).max(200),
})

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'projectId')!
  const imageId = getRouterParam(event, 'imageId')!
  const variationId = getRouterParam(event, 'variationId')!
  const body = await readValidatedBody(event, bodySchema.parse)

  await resolveVariationForUser(event, projectId, imageId, variationId)

  const db = useDB()
  const [row] = await db.update(schema.imageVariations)
    .set({ name: body.name, updatedAt: new Date() })
    .where(eq(schema.imageVariations.id, variationId))
    .returning()

  return { variation: row }
})
