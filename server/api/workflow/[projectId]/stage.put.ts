import { useDB, schema } from '~~/server/database'
import { eq, and } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'
import { resolveWritableProjectById } from '~~/server/utils/resolveProject'
import { z } from 'zod'
import { WORKFLOW_STAGES } from '~~/shared/types/workflow'

const bodySchema = z.object({
  stage: z.enum(WORKFLOW_STAGES as any),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const projectId = getRouterParam(event, 'projectId')!
  const body = await readValidatedBody(event, bodySchema.parse)
  const db = useDB()

  const project = await resolveWritableProjectById(user, projectId)

  const [updated] = await db
    .update(schema.projects)
    .set({ currentStage: body.stage, updatedAt: new Date() })
    .where(eq(schema.projects.id, project.id))
    .returning()

  return updated
})
