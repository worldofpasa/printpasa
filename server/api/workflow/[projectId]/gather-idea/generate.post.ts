import { useDB, schema } from '~~/server/database'
import { eq } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'
import { resolveWritableProjectById } from '~~/server/utils/resolveProject'
import { getTextProviderForStage } from '~~/server/utils/ai'
import { buildGatherIdeaPrompt } from '~~/server/services/prompts'
import { runIdeaResearch, emptyResearchBundle } from '~~/server/services/idea-research'
import { slugify } from '~~/server/utils/slugify'
import { generateUniqueSlug } from '~~/server/utils/slugify'
import { startWorkflowRun, logWorkflowRunEvent } from '~~/server/services/workflow-run-audit'
import { notifyManualRun } from '~~/server/services/telegram/run-notify'
import { z } from 'zod'

const bodySchema = z.object({
  ideaDescription: z.string().min(10),
  count: z.number().min(1).max(50).default(10),
})

function buildResearchResponse(research: ResearchBundle) {
  return {
    title: research.plan.projectTitle,
    inferredAudience: research.plan.inferredAudience,
    signals: research.signals,
    sourceStatuses: research.sourceStatuses,
    warnings: research.warnings,
  }
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const projectId = getRouterParam(event, 'projectId')!
  const body = await readValidatedBody(event, bodySchema.parse)
  const db = useDB()

  const project = await resolveWritableProjectById(user, projectId)
  const ownerUserId = project.userId

  const ai = await getTextProviderForStage(event, ownerUserId, 'gather-idea', { projectId: project.id })
  const runId = startWorkflowRun('ui', { projectId: project.id })

  console.log('[gather-idea/generate] starting research orchestration', {
    runId,
    projectId: project.id,
    ideaLength: body.ideaDescription.length,
    count: body.count,
  })

  let research: ResearchBundle
  try {
    research = await runIdeaResearch(body.ideaDescription, ai, ownerUserId)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('[gather-idea/generate] research orchestration failed, continuing:', message)
    research = emptyResearchBundle(body.ideaDescription, `Research failed: ${message}`)
  }

  if (research.warnings.length > 0) {
    console.warn('[gather-idea/generate] research warnings:', research.warnings)
  }

  await logWorkflowRunEvent({
    runId,
    source: 'ui',
    phase: 'research',
    level: research.warnings.length > 0 ? 'warning' : 'success',
    message: `Research completed for "${research.plan.projectTitle}"`,
    projectId: project.id,
    detail: {
      sourceStatuses: buildResearchResponse(research).sourceStatuses,
      warnings: research.warnings,
    },
  })

  const { plan } = research
  const newSlug = await generateUniqueSlug(ownerUserId, plan.projectTitle, project.id)

  await db.update(schema.projects).set({
    name: plan.projectTitle,
    slug: newSlug,
    description: body.ideaDescription,
    trendSource: 'manual',
    niche: 'custom',
    customNiche: plan.inferredAudience,
    themeCount: body.count,
    researchSnapshot: JSON.stringify(research),
    updatedAt: new Date(),
  }).where(eq(schema.projects.id, project.id))

  const prompt = buildGatherIdeaPrompt({
    ideaDescription: body.ideaDescription,
    inferredAudience: plan.inferredAudience,
    research,
    count: body.count,
  })

  let themesToInsert: Array<{
    id: string
    projectId: string
    title: string
    slug: string
    description: string
    targetDemographic: string
    sortOrder: number
    isSelected: boolean
    isValidated: boolean
    isWinner: boolean
    generationBatch: string
  }> = []

  try {
    const result = await ai.generateJSON<{
      themes: Array<{
        title: string
        description: string
        targetDemographic: string
      }>
    }>({
      prompt: prompt.user,
      systemPrompt: prompt.system,
      temperature: 0.8,
    })

    const batchId = crypto.randomUUID()
    themesToInsert = result.themes.map((theme, idx) => ({
      id: crypto.randomUUID(),
      projectId: project.id,
      title: theme.title,
      slug: slugify(theme.title),
      description: theme.description,
      targetDemographic: theme.targetDemographic,
      sortOrder: idx,
      isSelected: false,
      isValidated: false,
      isWinner: false,
      generationBatch: batchId,
    }))

    if (themesToInsert.length > 0) {
      await db.insert(schema.themes).values(themesToInsert)
    }

    await logWorkflowRunEvent({
      runId,
      source: 'ui',
      phase: 'themes',
      level: 'success',
      message: `${themesToInsert.length} themes created`,
      projectId: project.id,
    })

    void notifyManualRun({
      projectTitle: plan.projectTitle,
      projectSlug: newSlug,
      themeCount: themesToInsert.length,
      sourceStatuses: buildResearchResponse(research).sourceStatuses,
      runId,
      success: true,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    await logWorkflowRunEvent({
      runId,
      source: 'ui',
      phase: 'themes',
      level: 'error',
      message: `Theme generation failed: ${message}`,
      projectId: project.id,
    })
    throw createError({
      statusCode: 502,
      statusMessage: `Theme generation failed: ${message}`,
      data: {
        research: buildResearchResponse(research),
        themeGeneration: 'failed',
      },
    })
  }

  return {
    themes: themesToInsert,
    count: themesToInsert.length,
    themeGeneration: 'success' as const,
    research: buildResearchResponse(research),
  }
})
