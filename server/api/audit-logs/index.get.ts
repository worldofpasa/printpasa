import { z } from 'zod'
import { requireUser } from '~~/server/utils/auth'
import { listAuditLogs } from '~~/server/services/audit-log'

const querySchema = z.object({
  q: z.string().optional(),
  projectId: z.string().optional(),
  stage: z.string().optional(),
  actor: z.string().optional(),
  level: z.string().optional(),
  runId: z.string().optional(),
  action: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).optional(),
  offset: z.coerce.number().min(0).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  if (!user.isSuperuser) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.message })
  }

  return listAuditLogs(parsed.data)
})
