import { useDB, schema } from '~~/server/database'
import { eq, and, inArray } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'
import { resolveWritableProjectById } from '~~/server/utils/resolveProject'
import { z } from 'zod'

const bodySchema = z.object({
  productIds: z.array(z.string()).min(1),
  unarchive: z.boolean().optional().default(false),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const projectId = getRouterParam(event, 'projectId')!
  const body = await readValidatedBody(event, bodySchema.parse)
  const db = useDB()

  const project = await resolveWritableProjectById(user, projectId)

  const matching = await db.query.products.findMany({
    where: and(
      eq(schema.products.projectId, project.id),
      inArray(schema.products.id, body.productIds),
    ),
  })

  const ids = matching.map((p) => p.id)
  if (ids.length === 0) return { updated: 0 }

  const nextStatus = body.unarchive ? 'created' : 'archived'

  await db.update(schema.products).set({
    status: nextStatus,
    updatedAt: new Date(),
  }).where(and(
    eq(schema.products.projectId, project.id),
    inArray(schema.products.id, ids),
  ))

  return { updated: ids.length, status: nextStatus }
})
