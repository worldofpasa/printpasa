import { eq } from 'drizzle-orm'
import { useDB, schema } from '~~/server/database'
import { discoverTopics } from '~~/server/services/topic-discovery'
import type { TopicSeed } from '~~/server/services/topic-discovery'
import { resolvePipelineOwnerUserId } from '~~/server/utils/superuser-seed'
import { generateUniqueSlug } from '~~/server/utils/slugify'
import { schedulePipelineJob } from './run-job'
import { startWorkflowRun, logWorkflowRunEvent } from '~~/server/services/workflow-run-audit'
import { notifyDiscoveryBatch } from '~~/server/services/telegram/run-notify'
import type { DiscoveryMode } from '~~/server/services/topic-discovery'

export interface AutomatedResearchResult {
  runId: string
  scheduleId: string
  scheduleName: string
  discoveryMode: 'event' | 'daily'
  seeds: TopicSeed[]
  enqueuedJobs: Array<{ jobId: string; projectId: string; projectName: string; projectSlug: string }>
  stats: {
    candidates: number
    selected: number
    skippedDuplicates: number
  }
}

export async function runAutomatedResearch(scheduleId: string): Promise<AutomatedResearchResult> {
  const db = useDB()
  const config = useRuntimeConfig()

  const schedule = await db.query.pipelineSchedules.findFirst({
    where: eq(schema.pipelineSchedules.id, scheduleId),
  })
  if (!schedule) {
    throw new Error(`[brainstorm] schedule not found: ${scheduleId}`)
  }

  const runId = startWorkflowRun('cron', { scheduleId })
  const ownerRef = (config.pipelineOwnerUserId as string)?.trim() || 'admin'
  const ownerId = await resolvePipelineOwnerUserId(ownerRef) || 'admin'

  const discovery = await discoverTopics({
    scheduleId,
    discoveryMode: (schedule.discoveryMode as DiscoveryMode | undefined) ?? 'auto',
    maxJobs: schedule.maxJobsPerRun ?? 3,
  })

  await logWorkflowRunEvent({
    runId,
    source: 'cron',
    phase: 'discovery',
    level: discovery.seeds.length > 0 ? 'success' : 'warning',
    message: `${discovery.seeds.length} seeds (${discovery.mode} mode)`,
    scheduleId,
    detail: {
      discoveryMode: discovery.mode,
      candidates: discovery.stats.candidates,
      selected: discovery.stats.selected,
      skippedDuplicates: discovery.stats.skippedDuplicates,
      seeds: discovery.seeds.map((s) => ({
        projectName: s.projectName,
        source: s.source,
        holidayId: s.sourceMeta.holidayId,
        trendQuery: s.sourceMeta.trendQuery,
      })),
    },
  })

  const enqueuedJobs: AutomatedResearchResult['enqueuedJobs'] = []

  for (const seed of discovery.seeds) {
    const projectName = seed.projectName
    const nicheDescription = seed.ideaDescription

    const projectId = crypto.randomUUID()
    const slug = await generateUniqueSlug(ownerId, projectName)

    await db.insert(schema.projects).values({
      id: projectId,
      userId: ownerId,
      name: projectName,
      slug,
      description: nicheDescription,
      originSource: 'cron',
      originActor: schedule.name,
      originMeta: JSON.stringify({ scheduleId, runId }),
    })

    // Track niche usage for rotation
    if (seed.sourceMeta.nicheSlug) {
      const { markNicheUsed } = await import('~~/server/services/topic-discovery/niche-db')
      await markNicheUsed(seed.sourceMeta.nicheSlug)
    }

    const jobId = crypto.randomUUID()
    await db.insert(schema.pipelineJobs).values({
      id: jobId,
      status: 'pending',
      source: 'cron',
      sourceMeta: JSON.stringify({
        scheduleId,
        runId,
        discoveryMode: discovery.mode,
        seedSource: seed.source,
        seedMeta: seed.sourceMeta,
      }),
      ideaText: nicheDescription,
      projectName,
      projectId,
      projectSlug: slug,
      currentStep: 'pending',
    })

    await logWorkflowRunEvent({
      runId,
      source: 'cron',
      phase: 'pipeline',
      level: 'info',
      message: `Enqueued job for "${projectName}"`,
      scheduleId,
      projectId,
      pipelineJobId: jobId,
      detail: { seedSource: seed.source, seedMeta: seed.sourceMeta },
    })

    console.log(`[brainstorm] enqueued job ${jobId} for project "${projectName}" (slug: ${slug})`)
    enqueuedJobs.push({ jobId, projectId, projectName, projectSlug: slug })
    schedulePipelineJob(jobId)
  }

  await notifyDiscoveryBatch({
    scheduleName: schedule.name,
    discoveryMode: discovery.mode,
    seeds: discovery.seeds,
    runId,
    stats: {
      candidates: discovery.stats.candidates,
      skippedDuplicates: discovery.stats.skippedDuplicates,
    },
  })

  return {
    runId,
    scheduleId,
    scheduleName: schedule.name,
    discoveryMode: discovery.mode,
    seeds: discovery.seeds,
    enqueuedJobs,
    stats: discovery.stats,
  }
}
