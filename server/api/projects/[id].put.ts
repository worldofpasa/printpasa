import { useDB, schema } from '~~/server/database'
import { eq } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'
import { generateUniqueSlug } from '~~/server/utils/slugify'
import { resolveProjectBySlug } from '~~/server/utils/resolveProject'
import { z } from 'zod'

const bodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  trendSource: z.string().optional(),
  niche: z.string().optional(),
  customNiche: z.string().optional(),
  themeCount: z.number().min(1).max(50).optional(),
  aiProvider: z.string().optional(),
  imageProvider: z.string().optional(),
  fulfillmentProvider: z.string().optional(),
  status: z.enum(['active', 'completed', 'archived']).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const slug = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, bodySchema.parse)
  const db = useDB()

  const existing = await resolveProjectBySlug(user, slug)

  const updateData: Record<string, any> = { ...body, updatedAt: new Date() }
  if (body.name) {
    updateData.slug = await generateUniqueSlug(user.id, body.name, existing.id)
  }

  const [updated] = await db
    .update(schema.projects)
    .set(updateData)
    .where(eq(schema.projects.id, existing.id))
    .returning()

  return updated
})
