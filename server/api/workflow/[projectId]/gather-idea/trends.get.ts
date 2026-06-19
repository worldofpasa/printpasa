import { requireUser } from '~~/server/utils/auth'
import { resolveProjectById } from '~~/server/utils/resolveProject'
import type { TrendItem } from '~~/server/services/trends'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const projectId = getRouterParam(event, 'projectId')!

  const project = await resolveProjectById(user, projectId)

  if (!project.trendingTopicsSnapshot) return { topics: [] as TrendItem[] }

  try {
    const topics = JSON.parse(project.trendingTopicsSnapshot) as TrendItem[]
    return { topics }
  } catch {
    return { topics: [] as TrendItem[] }
  }
})
