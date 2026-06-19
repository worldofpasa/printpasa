import { requireUser } from '~~/server/utils/auth'
import { getAuditLogById } from '~~/server/services/audit-log'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  if (!user.isSuperuser) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const id = getRouterParam(event, 'id')!
  const log = await getAuditLogById(id)
  if (!log) {
    throw createError({ statusCode: 404, statusMessage: 'Audit log not found' })
  }

  return { item: log }
})
