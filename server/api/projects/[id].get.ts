import { requireUser } from '~~/server/utils/auth'
import { resolveProjectBySlug } from '~~/server/utils/resolveProject'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const slug = getRouterParam(event, 'id')!
  const project = await resolveProjectBySlug(user, slug)
  return project
})
