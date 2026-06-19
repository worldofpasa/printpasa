import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDB, schema } from '~~/server/database'
import { requireUser } from '~~/server/utils/auth'
import { resolveWritableProjectById } from '~~/server/utils/resolveProject'
import { TREND_PROVIDERS } from '~~/shared/types/providers'
import { getTrendsProviderForUser, fetchTrendsCached } from '~~/server/services/trends'

const bodySchema = z.object({
  source: z.enum(TREND_PROVIDERS).optional(),
  niche: z.string().min(1),
  limit: z.number().int().min(1).max(50).default(20),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const projectId = getRouterParam(event, 'projectId')!
  const body = await readValidatedBody(event, bodySchema.parse)
  const db = useDB()

  const project = await resolveWritableProjectById(user, projectId)

  const provider = await getTrendsProviderForUser(event, user.id, body.source)
  const topics = await fetchTrendsCached(provider, { niche: body.niche, limit: body.limit })

  await db
    .update(schema.projects)
    .set({
      trendingTopicsSnapshot: JSON.stringify(topics),
      trendSource: provider.name,
      updatedAt: new Date(),
    })
    .where(eq(schema.projects.id, project.id))

  return { topics, count: topics.length, source: provider.name }
})
