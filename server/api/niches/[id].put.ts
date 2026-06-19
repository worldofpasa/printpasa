import { z } from 'zod'
import { useDB, schema } from '~~/server/database'
import { eq } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'

const bodySchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(300).nullable().optional(),
  isActive: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing niche id' })
  const body = await readValidatedBody(event, bodySchema.parse)
  const db = useDB()

  const existing = await db.query.niches.findFirst({ where: eq(schema.niches.id, id) })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Niche not found' })

  await db
    .update(schema.niches)
    .set({
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      updatedAt: new Date(),
    })
    .where(eq(schema.niches.id, id))

  return db.query.niches.findFirst({ where: eq(schema.niches.id, id) })
})
