import { useDB, schema } from '~~/server/database'
import { eq, and } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'
import { z } from 'zod'

const bodySchema = z.object({
  blueprintId: z.string().min(1),  // raw Printify blueprint ID
  imageIndex: z.number().int().min(0),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readValidatedBody(event, bodySchema.parse)
  const db = useDB()

  const pb = await db.query.providerBlueprints.findFirst({
    where: and(
      eq(schema.providerBlueprints.blueprintId, body.blueprintId),
      eq(schema.providerBlueprints.provider, 'printify'),
    ),
  })
  if (!pb) throw createError({ statusCode: 404, statusMessage: 'Blueprint not found' })

  const images: string[] = pb.allImages ? JSON.parse(pb.allImages) : []
  const chosen = images[body.imageIndex]
  if (!chosen) throw createError({ statusCode: 400, statusMessage: 'Image index out of range' })

  await db.update(schema.providerBlueprints)
    .set({ previewImageUrl: chosen })
    .where(eq(schema.providerBlueprints.id, pb.id))

  return { ok: true, previewImageUrl: chosen }
})
