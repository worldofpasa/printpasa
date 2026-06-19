import { useDB, schema } from '~~/server/database'
import { eq, and, inArray } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'
import { resolveWritableProjectById } from '~~/server/utils/resolveProject'
import { z } from 'zod'

const bodySchema = z.object({
  themeIds: z.array(z.string()).min(1),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const projectId = getRouterParam(event, 'projectId')!
  const body = await readValidatedBody(event, bodySchema.parse)
  const db = useDB()

  // Verify project ownership and resolve slug
  const project = await resolveWritableProjectById(user, projectId)

  // Deselect all themes first
  await db.update(schema.themes)
    .set({ isSelected: false })
    .where(eq(schema.themes.projectId, project.id))

  // Select the chosen themes
  await db.update(schema.themes)
    .set({ isSelected: true })
    .where(and(
      eq(schema.themes.projectId, project.id),
      inArray(schema.themes.id, body.themeIds),
    ))

  return { selectedCount: body.themeIds.length }
})
