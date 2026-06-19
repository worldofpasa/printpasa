import { eq, and } from 'drizzle-orm'
import { useDB, schema } from '~~/server/database'
import { getDefaultTelegramChatId, getPipelineDefaults } from './config'
import {
  createProject,
  generateImages,
  generatePrompts,
  generateThemes,
  runValidation,
  selectThemes,
  selectWinners,
  setStage,
  updateImageSelection,
} from './api-client'
import {
  getJobEventSummary,
  getSuccessfulSteps,
  insertPipelineEvent,
  recordRecoverableWarning,
  recordStep,
  updateJobStep,
} from './logger'
import type { PipelineNotifyTarget, TelegramSourceMeta } from './types'
import { projectNameFromIdea } from '../telegram/parse-idea'
import { notifyIdeaGeneration } from '../telegram/run-notify'
import { sendTelegramMessage, getTelegramTopics } from '../telegram/notify'
import { logWorkflowRunEvent } from '../workflow-run-audit'
import type { SourceStatus } from '../idea-research/types'
import { getPipelineApiBaseUrl } from './config'
import { resolvePipelineOwnerUserId } from '~~/server/utils/superuser-seed'

function telegramActorLabel(meta: TelegramSourceMeta | null): string {
  if (!meta?.fromUser) return 'Telegram'
  return meta.fromUser.startsWith('@') ? meta.fromUser : `@${meta.fromUser}`
}

async function tagTelegramProjectOrigin(
  projectId: string,
  meta: TelegramSourceMeta | null,
) {
  const db = useDB()
  await db
    .update(schema.projects)
    .set({
      originSource: 'telegram',
      originActor: telegramActorLabel(meta),
      originMeta: JSON.stringify({
        telegramUserId: meta?.fromUserId,
        chatId: meta?.chatId,
        messageThreadId: meta?.messageThreadId,
      }),
      updatedAt: new Date(),
    })
    .where(eq(schema.projects.id, projectId))
}

async function skipJobIfProjectArchived(
  projectId: string,
  jobId: string,
  notify: PipelineNotifyTarget | null,
  projectName: string,
) {
  const db = useDB()
  const project = await db.query.projects.findFirst({
    where: eq(schema.projects.id, projectId),
  })
  if (project?.status !== 'archived') return false

  await db
    .update(schema.pipelineJobs)
    .set({
      status: 'completed',
      currentStep: 'skipped',
      errorMessage: 'Project archived',
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.pipelineJobs.id, jobId))

  if (notify) {
    await sendTelegramMessage(
      notify.chatId,
      `⏭ Pipeline skipped — "${projectName}" is archived.`,
      notify.replyToMessageId,
    ).catch((e) => console.warn('[pipeline] archived skip notify failed:', e))
  }

  console.log(`[pipeline] job=${jobId} skipped — project ${projectId} archived`)
  return true
}

function notifyFromMeta(meta: TelegramSourceMeta | null): PipelineNotifyTarget | null {
  if (!meta?.chatId) return null
  return {
    chatId: meta.chatId,
    replyToMessageId: meta.replyToMessageId ?? meta.messageId,
  }
}

async function loadOwnerSettings(ownerUserId: string) {
  const db = useDB()
  const settings = await db.query.userSettings.findFirst({
    where: eq(schema.userSettings.userId, ownerUserId),
  })
  const staticDefaults = getPipelineDefaults()
  return {
    useTrademarkApi: settings?.useTrademarkApi ?? false,
    useBrandRiskApi: settings?.useBrandRiskApi ?? false,
    themeCount: settings?.defaultThemeCount ?? staticDefaults.themeCount,
    winnerCount: settings?.defaultWinnerCount ?? staticDefaults.winnerCount,
    promptsPerTheme: settings?.defaultPromptsPerTheme ?? staticDefaults.promptsPerTheme,
    trendSource: staticDefaults.trendSource,
    niche: staticDefaults.niche,
  }
}

export async function runPipelineOperator(jobId: string) {
  const db = useDB()
  const job = await db.query.pipelineJobs.findFirst({
    where: eq(schema.pipelineJobs.id, jobId),
  })
  if (!job) {
    throw new Error(`Pipeline job not found: ${jobId}`)
  }
  if (job.status === 'completed') {
    return job
  }

  const meta: TelegramSourceMeta | null = job.sourceMeta
    ? JSON.parse(job.sourceMeta)
    : null
  const notify = notifyFromMeta(meta)
  const runId = meta?.runId ?? crypto.randomUUID()
  const workflowSource = job.source === 'cron' ? 'cron' as const : 'telegram' as const
  const ideaText = job.ideaText
  const projectName = job.projectName ?? projectNameFromIdea(ideaText)

  await db
    .update(schema.pipelineJobs)
    .set({ status: 'running', updatedAt: new Date() })
    .where(eq(schema.pipelineJobs.id, jobId))

  const ownerRef = (useRuntimeConfig().pipelineOwnerUserId as string)?.trim()
  const ownerId = ownerRef ? await resolvePipelineOwnerUserId(ownerRef) : null
  const defaults = ownerId
    ? await loadOwnerSettings(ownerId)
    : { ...getPipelineDefaults(), useTrademarkApi: false, useBrandRiskApi: false }

  let projectId = job.projectId
  let projectSlug = job.projectSlug
  const completedSteps = await getSuccessfulSteps(jobId)

  try {
    if (projectId && await skipJobIfProjectArchived(projectId, jobId, notify, projectName)) {
      return await db.query.pipelineJobs.findFirst({
        where: eq(schema.pipelineJobs.id, jobId),
      })
    }

    if (!projectId) {
      await updateJobStep(jobId, 'create_project')
      const project = await recordStep(
        jobId,
        'create_project',
        () => createProject(projectName, ideaText),
        { notify, stepLabel: 'Create project' },
      )
      projectId = project.id
      projectSlug = project.slug
      await db
        .update(schema.pipelineJobs)
        .set({
          projectId,
          projectSlug,
          projectName: project.name,
          updatedAt: new Date(),
        })
        .where(eq(schema.pipelineJobs.id, jobId))
    }

    if (job.source === 'telegram' && projectId) {
      await tagTelegramProjectOrigin(projectId, meta)
    }

    if (await skipJobIfProjectArchived(projectId!, jobId, notify, projectName)) {
      return await db.query.pipelineJobs.findFirst({
        where: eq(schema.pipelineJobs.id, jobId),
      })
    }

    let generated: {
      themes: Array<{ id: string }>
      count: number
      themeGeneration?: 'success' | 'failed'
      research?: {
        title: string
        sourceStatuses?: SourceStatus[]
      }
    }
    if (!completedSteps.has('gather_idea')) {
      if (await skipJobIfProjectArchived(projectId!, jobId, notify, projectName)) {
        return await db.query.pipelineJobs.findFirst({
          where: eq(schema.pipelineJobs.id, jobId),
        })
      }
      await updateJobStep(jobId, 'gather_idea')
      try {
        generated = await recordStep(
          jobId,
          'gather_idea',
          () =>
            generateThemes(projectId!, {
              ideaDescription: ideaText,
              count: defaults.themeCount,
            }),
          { notify: null, stepLabel: 'Research and generate themes' },
        )

        const researchTitle = generated.research?.title ?? projectName
        if (generated.research?.title) {
          await db
            .update(schema.pipelineJobs)
            .set({
              projectName: generated.research.title,
              updatedAt: new Date(),
            })
            .where(eq(schema.pipelineJobs.id, jobId))
        }

        await logWorkflowRunEvent({
          runId,
          source: workflowSource,
          phase: 'research',
          level: 'success',
          message: `Research completed for "${researchTitle}"`,
          projectId: projectId!,
          pipelineJobId: jobId,
          detail: {
            sourceStatuses: generated.research?.sourceStatuses ?? [],
          },
        })

        await logWorkflowRunEvent({
          runId,
          source: workflowSource,
          phase: 'themes',
          level: generated.count > 0 ? 'success' : 'warning',
          message: `${generated.count} themes created`,
          projectId: projectId!,
          pipelineJobId: jobId,
        })

        await notifyIdeaGeneration({
          source: workflowSource,
          sourceMeta: meta,
          projectTitle: researchTitle,
          themeCount: generated.count,
          sourceStatuses: generated.research?.sourceStatuses ?? [],
          success: true,
          runId,
        })
      } catch (error: unknown) {
        const err = error as { statusMessage?: string; message?: string; data?: { research?: { title?: string; sourceStatuses?: SourceStatus[] } } }
        await logWorkflowRunEvent({
          runId,
          source: workflowSource,
          phase: 'themes',
          level: 'error',
          message: err.statusMessage ?? err.message ?? 'Theme generation failed',
          projectId: projectId ?? undefined,
          pipelineJobId: jobId,
          detail: {
            sourceStatuses: err.data?.research?.sourceStatuses ?? [],
          },
        })

        await notifyIdeaGeneration({
          source: workflowSource,
          sourceMeta: meta,
          projectTitle: err.data?.research?.title ?? projectName,
          themeCount: 0,
          sourceStatuses: err.data?.research?.sourceStatuses ?? [],
          success: false,
          error: err.statusMessage ?? err.message ?? String(error),
          runId,
        })
        throw error
      }
    } else {
      const existingThemes = await db.query.themes.findMany({
        where: and(
          eq(schema.themes.projectId, projectId!),
          eq(schema.themes.isSelected, true),
        ),
      })
      generated = { themes: existingThemes.map((t) => ({ id: t.id })), count: existingThemes.length }
      console.log(`[pipeline] job=${jobId} step=gather_idea skipped (${existingThemes.length} themes)`)
    }

    const themeIds = generated.themes.map((t) => t.id)
    if (themeIds.length === 0) {
      throw createError({ statusCode: 500, statusMessage: 'No themes generated' })
    }

    if (!completedSteps.has('select_themes')) {
      await updateJobStep(jobId, 'select_themes')
      await recordStep(
        jobId,
        'select_themes',
        () => selectThemes(projectId!, themeIds),
        { notify, stepLabel: 'Select themes' },
      )
    } else {
      console.log(`[pipeline] job=${jobId} step=select_themes skipped`)
    }

    if (!completedSteps.has('stage_validator')) {
      await updateJobStep(jobId, 'stage_validator')
      await recordStep(
        jobId,
        'stage_validator',
        () => setStage(projectId!, 'idea-validator'),
        { notify, stepLabel: 'Advance to validator' },
      )
    } else {
      console.log(`[pipeline] job=${jobId} step=stage_validator skipped`)
    }

    let validation: {
      themes: Array<{ id: string; isWinner: boolean | null }>
      validation: unknown
    }
    const existingValidated = await db.query.themes.findMany({
      where: and(
        eq(schema.themes.projectId, projectId!),
        eq(schema.themes.isSelected, true),
      ),
    })
    const validationAlreadyDone = existingValidated.length > 0
      && existingValidated.every((t) => t.isValidated)
      && existingValidated.some((t) => t.isWinner)

    if (!completedSteps.has('validate') && !validationAlreadyDone) {
      await updateJobStep(jobId, 'validate')
      validation = await recordStep(
        jobId,
        'validate',
        () =>
          runValidation(projectId!, {
            winnerCount: defaults.winnerCount,
            useTrademarkApi: defaults.useTrademarkApi,
            useBrandRiskApi: defaults.useBrandRiskApi,
          }),
        { notify, stepLabel: 'Validate ideas' },
      )
    } else {
      validation = {
        themes: existingValidated.map((t) => ({ id: t.id, isWinner: t.isWinner })),
        validation: {},
      }
      console.log(`[pipeline] job=${jobId} step=validate skipped (${existingValidated.filter((t) => t.isWinner).length} winners)`)
    }

    const winnerIds = validation.themes
      .filter((t) => t.isWinner)
      .map((t) => t.id)
    if (winnerIds.length === 0) {
      throw createError({ statusCode: 500, statusMessage: 'No winner themes after validation' })
    }

    if (!completedSteps.has('select_winners')) {
      await updateJobStep(jobId, 'select_winners')
      await recordStep(
        jobId,
        'select_winners',
        () => selectWinners(projectId!, winnerIds),
        { notify, stepLabel: 'Confirm winners' },
      )
    } else {
      console.log(`[pipeline] job=${jobId} step=select_winners skipped`)
    }

    // Researcher → Creative Director handoff notifications
    const topics = getTelegramTopics()
    const baseUrl = getPipelineApiBaseUrl()
    if (topics.ideaGeneration) {
      const ideaReviewUrl = `${baseUrl}/projects/${projectSlug}/stage/idea-validator`
      await sendTelegramMessage(
        notify?.chatId ?? getDefaultTelegramChatId(),
        [
          `✅ Stage 1–2 done — "${projectName}"`,
          `${winnerIds.length} winner(s) after validation`,
          `Review: ${ideaReviewUrl}`,
        ].join('\n'),
        undefined,
        topics.ideaGeneration,
      ).catch((e) => console.warn('[pipeline] ideageneration topic notify failed:', e))
    }
    if (topics.designReview) {
      await sendTelegramMessage(
        notify?.chatId ?? getDefaultTelegramChatId(),
        `🎨 Design work starting — "${projectName}"\n${winnerIds.length} brief(s) handed off`,
        undefined,
        topics.designReview,
      ).catch((e) => console.warn('[pipeline] designreview start notify failed:', e))
    }

    await updateJobStep(jobId, 'stage_prompts')
    await recordStep(
      jobId,
      'stage_prompts',
      () => setStage(projectId!, 'image-prompts'),
      { notify, stepLabel: 'Advance to prompts' },
    )

    await updateJobStep(jobId, 'prompts')
    await recordStep(
      jobId,
      'prompts',
      () => generatePrompts(projectId!, defaults.promptsPerTheme),
      { notify, stepLabel: 'Generate prompts' },
    )

    await updateJobStep(jobId, 'stage_images')
    await recordStep(
      jobId,
      'stage_images',
      () => setStage(projectId!, 'image-generate'),
      { notify, stepLabel: 'Advance to image generate' },
    )

    await updateJobStep(jobId, 'images_generate')
    const imagesResult = await recordStep(
      jobId,
      'images_generate',
      () => generateImages(projectId!),
      { notify, stepLabel: 'Generate images' },
    )

    const completedImages = imagesResult.images.filter(
      (img) => img.generationStatus === 'completed',
    )

    await updateJobStep(jobId, 'select_images')
    await recordStep(
      jobId,
      'select_images',
      async () => {
        for (const img of completedImages) {
          await updateImageSelection(projectId!, img.id, true)
        }
      },
      { notify, stepLabel: `Select ${completedImages.length} image(s)` },
    )

    await updateJobStep(jobId, 'stage_handoff')
    await recordStep(
      jobId,
      'stage_handoff',
      () => setStage(projectId!, 'image-generate'),
      { notify, stepLabel: 'Stage handoff' },
    )

    await recordStep(jobId, 'complete', async () => true, {
      notify: null,
      stepLabel: 'Complete',
    })

    const handoffUrl = `${baseUrl}/projects/${projectSlug}/stage/image-generate`
    const summary = await getJobEventSummary(jobId)

    let auditFooter = `${summary.success} steps OK`
    if (summary.warnings.length > 0) {
      auditFooter += `, ${summary.warnings.length} warning(s)`
      if (summary.warningMessages.length > 0) {
        auditFooter += ` (${summary.warningMessages[0]})`
      }
    }

    await db
      .update(schema.pipelineJobs)
      .set({
        status: 'completed',
        currentStep: 'complete',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.pipelineJobs.id, jobId))

    if (notify) {
      await sendTelegramMessage(
        notify.chatId,
        [
          `✅ Pipeline complete: "${projectName}"`,
          `${completedImages.length} image(s) ready`,
          handoffUrl,
          `Job: ${jobId}`,
          auditFooter,
        ].join('\n'),
        notify.replyToMessageId,
      )
    }
    const topicsOnComplete = getTelegramTopics()
    if (topicsOnComplete.designReview) {
      const chatId = notify?.chatId ?? getDefaultTelegramChatId()
      await sendTelegramMessage(
        chatId,
        [
          `✅ Design complete — "${projectName}"`,
          `${completedImages.length} image(s) ready`,
          `Review: ${handoffUrl}`,
        ].join('\n'),
        undefined,
        topicsOnComplete.designReview,
      ).catch((e) => console.warn('[pipeline] designreview complete notify failed:', e))
    }

    return await db.query.pipelineJobs.findFirst({
      where: eq(schema.pipelineJobs.id, jobId),
    })
  } catch (error: unknown) {
    const err = error as { statusMessage?: string; message?: string }
    const message = err.statusMessage ?? err.message ?? String(error)

    await db
      .update(schema.pipelineJobs)
      .set({
        status: 'failed',
        errorMessage: message,
        updatedAt: new Date(),
      })
      .where(eq(schema.pipelineJobs.id, jobId))

    const topicsOnFail = getTelegramTopics()
    if (topicsOnFail.designReview) {
      const chatId = notify?.chatId ?? getDefaultTelegramChatId()
      await sendTelegramMessage(
        chatId,
        `❌ Pipeline failed — "${projectName}"\n${message}`,
        undefined,
        topicsOnFail.designReview,
      ).catch((e) => console.warn('[pipeline] designreview fail notify failed:', e))
    }

    throw error
  }
}
