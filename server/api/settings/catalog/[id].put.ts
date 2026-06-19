import { useDB, schema } from '~~/server/database'
import { eq, and } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'
import { z } from 'zod'

const bodySchema = z.object({
  displayName: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  category: z.enum(['tshirt', 'hoodie', 'tanktop', 'cap', 'tote', 'cup']).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, bodySchema.parse)
  const db = useDB()

  const item = await db.query.catalogItems.findFirst({
    where: and(eq(schema.catalogItems.id, id), eq(schema.catalogItems.userId, user.id)),
  })
  if (!item) throw createError({ statusCode: 404, statusMessage: 'Catalog item not found' })

  const updates: Partial<typeof schema.catalogItems.$inferInsert> = {}
  if (body.displayName !== undefined) updates.displayName = body.displayName
  if (body.enabled !== undefined) updates.enabled = body.enabled
  if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder
  if (body.category !== undefined) updates.category = body.category

  if (Object.keys(updates).length > 0) {
    await db.update(schema.catalogItems).set(updates).where(eq(schema.catalogItems.id, id))
  }

  return { ok: true }
})
