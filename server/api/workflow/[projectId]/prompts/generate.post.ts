import { useDB, schema } from '~~/server/database'
import { eq, and, inArray } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'
import { resolveWritableProjectById } from '~~/server/utils/resolveProject'
import { getTextProviderForStage } from '~~/server/utils/ai'
import { buildImagePromptPrompt, normalizeImagePromptResult } from '~~/server/services/prompts'
import { z } from 'zod'

const bodySchema = z.object({
  promptsPerTheme: z.number().min(1).max(10).default(5),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const projectId = getRouterParam(event, 'projectId')!
  const body = await readValidatedBody(event, bodySchema.parse)
  const db = useDB()

  const project = await resolveWritableProjectById(user, projectId)

  // Get winning themes from Stage 2
  const winners = await db.query.themes.findMany({
    where: and(eq(schema.themes.projectId, project.id), eq(schema.themes.isWinner, true)),
  })

  if (winners.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No winners selected. Go back to Stage 2.' })
  }

  const ai = await getTextProviderForStage(event, user.id, 'image-prompts', { projectId: project.id })

  // Supersede any existing active prompts for the winning themes
  await db.update(schema.imagePrompts)
    .set({ status: 'superseded' })
    .where(and(
      inArray(schema.imagePrompts.themeId, winners.map((t) => t.id)),
      eq(schema.imagePrompts.status, 'active'),
    ))

  const allPrompts: Array<typeof schema.imagePrompts.$inferInsert> = []
  const batchId = crypto.randomUUID()

  // Generate prompts for each winning theme
  for (const theme of winners) {
    const prompt = buildImagePromptPrompt({
      theme: {
        title: theme.title,
        description: theme.description ?? '',
        contextNotes: theme.contextNotes,
        targetDemographic: theme.targetDemographic,
      },
      count: body.promptsPerTheme,
    })

    const result = await ai.generateJSON<{
      prompts: Array<{
        designLane?: string
        sloganText?: string | null
        promptText: string
        style: string
        backgroundColorHex?: string
        backgroundColorName?: string
      }>
    }>({
      prompt: prompt.user,
      systemPrompt: prompt.system,
      temperature: 0.8,
    })

    const promptsToUse = result?.prompts || (Array.isArray(result) ? result : [])

    for (const [idx, p] of promptsToUse.entries()) {
      const normalized = normalizeImagePromptResult(p)
      allPrompts.push({
        id: crypto.randomUUID(),
        themeId: theme.id,
        promptText: normalized.promptText,
        originalPromptText: normalized.promptText,
        style: normalized.style,
        designLane: normalized.designLane,
        sloganText: normalized.sloganText,
        recommendedModel: normalized.recommendedModel,
        backgroundColorHex: normalized.backgroundColorHex || null,
        backgroundColorName: normalized.backgroundColorName || null,
        sortOrder: idx,
        isSelected: true,
        status: 'active',
        generationBatch: batchId,
      })
    }
  }

  if (allPrompts.length > 0) {
    await db.insert(schema.imagePrompts).values(allPrompts)
  }

  return { prompts: allPrompts, count: allPrompts.length }
})
