import { getPipelineApiBaseUrl } from '~~/server/services/pipeline/config'
import { parseAllowedChatIds } from '~~/server/services/pipeline/config'
import { getTelegramTopics, sendTelegramMessage } from '~~/server/services/telegram/notify'
import {
  formatIdeaGenerationTelegramMessage,
  formatSourceStatusLine,
} from '~~/server/services/idea-research/source-status'
import type { SourceStatus } from '~~/server/services/idea-research/types'
import type { TopicSeed } from '~~/server/services/topic-discovery/types'
import type { WorkflowRunSource } from '~~/server/services/workflow-run-audit'

export interface NotifyTarget {
  chatId: number
  replyToMessageId?: number
  messageThreadId?: number
}

export function resolveDefaultChatId(): number | null {
  const config = useRuntimeConfig()
  const allowed = parseAllowedChatIds(config.telegramAllowedChatIds)
  const first = [...allowed][0]
  if (!first) return null
  const n = Number(first)
  return Number.isNaN(n) ? null : n
}

export function resolveNotifyTarget(
  source: WorkflowRunSource,
  sourceMeta?: { chatId?: number; replyToMessageId?: number; messageId?: number } | null,
): NotifyTarget | null {
  const topics = getTelegramTopics()

  if (source === 'telegram' && sourceMeta?.chatId) {
    return {
      chatId: sourceMeta.chatId,
      replyToMessageId: sourceMeta.replyToMessageId ?? sourceMeta.messageId,
      messageThreadId: topics.ideaGeneration ?? undefined,
    }
  }

  const chatId = resolveDefaultChatId()
  if (!chatId) return null

  return {
    chatId,
    messageThreadId: topics.ideaGeneration ?? undefined,
  }
}

export function formatDiscoveryBatchMessage(opts: {
  scheduleName: string
  discoveryMode: 'event' | 'daily'
  seeds: TopicSeed[]
  runId: string
  stats?: { candidates: number; skippedDuplicates: number }
}): string {
  const lines: string[] = [
    `Automated discovery — ${opts.discoveryMode} mode`,
    `Schedule: ${opts.scheduleName}`,
  ]

  if (opts.stats) {
    lines.push(`Candidates: ${opts.stats.candidates}, skipped duplicates: ${opts.stats.skippedDuplicates}`)
  }

  lines.push(`${opts.seeds.length} job${opts.seeds.length === 1 ? '' : 's'} queued:`)
  opts.seeds.forEach((seed, i) => {
    lines.push(`${i + 1}. ${seed.projectName}`)
  })
  lines.push(`Run: ${opts.runId}`)

  return lines.join('\n')
}

export function formatManualRunMessage(opts: {
  projectTitle: string
  projectSlug: string
  themeCount: number
  sourceStatuses: SourceStatus[]
  runId: string
  success: boolean
  error?: string
}): string {
  const baseUrl = getPipelineApiBaseUrl()
  const reviewUrl = `${baseUrl}/projects/${opts.projectSlug}/stage/gather-idea`

  const lines: string[] = []
  if (opts.success) {
    lines.push(`Manual idea run — "${opts.projectTitle}"`)
    lines.push(`${opts.themeCount} theme${opts.themeCount === 1 ? '' : 's'} created`)
  } else {
    lines.push(`Manual idea run failed — "${opts.projectTitle}"`)
    if (opts.error) lines.push(opts.error)
  }

  lines.push('')
  lines.push('Research sources:')
  for (const status of opts.sourceStatuses) {
    lines.push(`• ${formatSourceStatusLine(status)}`)
  }

  lines.push(`Review: ${reviewUrl}`)
  lines.push(`Run: ${opts.runId}`)

  return lines.join('\n')
}

export function formatScheduleTriggerCompleteMessage(opts: {
  scheduleName: string
  discoveryMode: 'event' | 'daily'
  seeds: TopicSeed[]
  runId: string
}): string {
  const seedLines = opts.seeds.map((s) => `• ${s.projectName} (${s.source})`).join('\n')
  return [
    `Schedule "${opts.scheduleName}" completed`,
    `Discovery mode: ${opts.discoveryMode}`,
    `${opts.seeds.length} job${opts.seeds.length === 1 ? '' : 's'} queued:`,
    seedLines || '(none — all duplicates or no trends found)',
    `Run: ${opts.runId}`,
  ].join('\n')
}

export async function notifyIdeaGeneration(opts: {
  source: WorkflowRunSource
  sourceMeta?: { chatId?: number; replyToMessageId?: number; messageId?: number } | null
  projectTitle: string
  themeCount: number
  sourceStatuses: SourceStatus[]
  success: boolean
  error?: string
  runId?: string
}) {
  const target = resolveNotifyTarget(opts.source, opts.sourceMeta)
  if (!target) return

  let message = formatIdeaGenerationTelegramMessage({
    projectTitle: opts.projectTitle,
    themeCount: opts.themeCount,
    sourceStatuses: opts.sourceStatuses,
    success: opts.success,
    error: opts.error,
  })

  if (opts.runId) {
    message += `\nRun: ${opts.runId}`
  }

  await sendTelegramMessage(
    target.chatId,
    message,
    target.replyToMessageId,
    target.messageThreadId,
  ).catch((e) => console.warn('[telegram/run-notify] idea generation notify failed:', e))
}

export async function notifyDiscoveryBatch(opts: {
  scheduleName: string
  discoveryMode: 'event' | 'daily'
  seeds: TopicSeed[]
  runId: string
  stats?: { candidates: number; skippedDuplicates: number }
}) {
  const target = resolveNotifyTarget('cron')
  if (!target) return

  const message = formatDiscoveryBatchMessage(opts)
  await sendTelegramMessage(
    target.chatId,
    message,
    undefined,
    target.messageThreadId,
  ).catch((e) => console.warn('[telegram/run-notify] discovery batch notify failed:', e))
}

export async function notifyManualRun(opts: {
  projectTitle: string
  projectSlug: string
  themeCount: number
  sourceStatuses: SourceStatus[]
  runId: string
  success: boolean
  error?: string
}) {
  const target = resolveNotifyTarget('ui')
  if (!target) return

  const message = formatManualRunMessage({ ...opts, success: opts.success })
  await sendTelegramMessage(
    target.chatId,
    message,
    undefined,
    target.messageThreadId,
  ).catch((e) => console.warn('[telegram/run-notify] manual run notify failed:', e))
}
