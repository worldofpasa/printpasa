import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDB, schema } from '~~/server/database'
import { requireUser } from '~~/server/utils/auth'

const bodySchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/),
  description: z.string().max(300).optional(),
  isActive: z.boolean().optional().default(true),
})

export default defineEventHandler(async (event) => {
  requireUser(event)
  const body = await readValidatedBody(event, bodySchema.parse)
  const db = useDB()

  const existing = await db.query.niches.findFirst({
    where: eq(schema.niches.slug, body.slug),
  })
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'A niche with this slug already exists' })
  }

  const id = crypto.randomUUID()
  await db.insert(schema.niches).values({
    id,
    slug: body.slug,
    name: body.name,
    description: body.description ?? null,
    source: 'manual',
    trendOrigin: null,
    isActive: body.isActive,
    usageCount: 0,
  })

  const row = await db.query.niches.findFirst({ where: eq(schema.niches.id, id) })
  return row
})
