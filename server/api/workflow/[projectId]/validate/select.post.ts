import { useDB, schema } from '~~/server/database'
import { eq, and, inArray } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'
import { resolveWritableProjectById } from '~~/server/utils/resolveProject'
import { z } from 'zod'

const bodySchema = z.object({
  winnerIds: z.array(z.string()).min(1),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const projectId = getRouterParam(event, 'projectId')!
  const body = await readValidatedBody(event, bodySchema.parse)
  const db = useDB()

  const project = await resolveWritableProjectById(user, projectId)

  // Reset all winners for this project
  await db.update(schema.themes)
    .set({ isWinner: false })
    .where(eq(schema.themes.projectId, project.id))

  // Set new winners
  await db.update(schema.themes)
    .set({ isWinner: true })
    .where(and(
      eq(schema.themes.projectId, project.id),
      inArray(schema.themes.id, body.winnerIds),
    ))

  return { winnerCount: body.winnerIds.length }
})
