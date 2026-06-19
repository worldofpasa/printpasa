import { useDB, schema } from '~~/server/database'
import { eq } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'
import { resolveWritableProjectById } from '~~/server/utils/resolveProject'
import { z } from 'zod'

const bodySchema = z.object({
  promptId: z.string(),
  promptText: z.string().min(1).optional(),
  isSelected: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const projectId = getRouterParam(event, 'projectId')!
  const body = await readValidatedBody(event, bodySchema.parse)
  const db = useDB()

  await resolveWritableProjectById(user, projectId)

  const updateData: Record<string, any> = {}
  if (body.promptText !== undefined) updateData.promptText = body.promptText
  if (body.isSelected !== undefined) updateData.isSelected = body.isSelected

  const [updated] = await db
    .update(schema.imagePrompts)
    .set(updateData)
    .where(eq(schema.imagePrompts.id, body.promptId))
    .returning()

  return updated
})
