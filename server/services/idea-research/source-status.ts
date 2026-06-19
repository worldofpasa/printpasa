import type { LabeledSignal, ResearchPlan, ResearchSignalSource, SourceFetchStatus, SourceStatus } from './types'

const DISPLAY_NAMES: Record<ResearchSignalSource, string> = {
  reddit: 'Reddit',
  'google-trends': 'Google Trends',
  pinterest: 'Pinterest',
  tiktok: 'TikTok',
}

export function isValidSignal(signal: LabeledSignal): boolean {
  return !signal.error
    && signal.title !== '(fetch failed)'
    && signal.title !== '(no posts returned)'
}

export function buildSourceStatus(
  source: ResearchSignalSource,
  signals: LabeledSignal[],
  opts?: { skippedReason?: string; notConfigured?: boolean; plannedCount?: number },
): SourceStatus {
  const displayName = DISPLAY_NAMES[source]

  if (opts?.skippedReason) {
    return {
      source,
      displayName,
      status: 'skipped',
      message: opts.skippedReason,
      signalCount: 0,
    }
  }

  if (opts?.notConfigured) {
    return {
      source,
      displayName,
      status: 'skipped',
      message: 'Search API key not configured (SearchAPI or SerpAPI)',
      signalCount: 0,
    }
  }

  const sourceSignals = signals.filter((s) => s.source === source)
  if (sourceSignals.length === 0) {
    if (opts?.plannedCount && opts.plannedCount > 0) {
      return {
        source,
        displayName,
        status: 'failed',
        message: `${opts.plannedCount} keyword(s) planned but no signals returned`,
        signalCount: 0,
      }
    }
    return {
      source,
      displayName,
      status: 'skipped',
      message: opts?.skippedReason ?? 'No queries planned',
      signalCount: 0,
    }
  }

  const valid = sourceSignals.filter(isValidSignal)
  const failed = sourceSignals.filter((s) => s.error || s.title === '(fetch failed)')

  if (valid.length === 0) {
    return {
      source,
      displayName,
      status: 'failed',
      message: failed[0]?.error ?? 'All fetches failed',
      signalCount: 0,
    }
  }

  if (failed.length > 0) {
    return {
      source,
      displayName,
      status: 'partial',
      message: `${valid.length} signal(s), ${failed.length} failed`,
      signalCount: valid.length,
    }
  }

  return {
    source,
    displayName,
    status: 'success',
    signalCount: valid.length,
  }
}

export function buildAllSourceStatuses(
  plan: ResearchPlan,
  signals: LabeledSignal[],
  serpApiConfigured: boolean,
): SourceStatus[] {
  const statuses: SourceStatus[] = []

  statuses.push(
    buildSourceStatus(
      'reddit',
      signals,
      plan.subreddits.length === 0
        ? { skippedReason: 'No subreddits planned' }
        : undefined,
    ),
  )

  const serpOpts = serpApiConfigured ? undefined : { notConfigured: true }

  statuses.push(
    buildSourceStatus(
      'google-trends',
      signals,
      plan.keywords.google.length === 0
        ? { skippedReason: 'No keywords planned' }
        : { plannedCount: plan.keywords.google.length, ...serpOpts },
    ),
  )

  statuses.push(
    buildSourceStatus(
      'pinterest',
      signals,
      plan.keywords.pinterest.length === 0
        ? { skippedReason: 'No keywords planned' }
        : serpOpts,
    ),
  )

  statuses.push(
    buildSourceStatus(
      'tiktok',
      signals,
      plan.keywords.tiktok.length === 0
        ? { skippedReason: 'No keywords planned' }
        : serpOpts,
    ),
  )

  return statuses
}

function statusEmoji(status: SourceFetchStatus): string {
  switch (status) {
    case 'success': return '✅'
    case 'partial': return '⚠️'
    case 'failed': return '❌'
    case 'skipped': return '⏭️'
  }
}

export function formatSourceStatusLine(status: SourceStatus): string {
  const emoji = statusEmoji(status.status)
  const detail = status.message ? ` — ${status.message}` : status.signalCount > 0 ? ` (${status.signalCount} signals)` : ''
  return `${status.displayName} ${emoji}${detail}`
}

export function formatIdeaGenerationTelegramMessage(opts: {
  projectTitle: string
  themeCount: number
  sourceStatuses: SourceStatus[]
  success: boolean
  error?: string
}): string {
  const lines: string[] = []

  if (opts.success) {
    lines.push(`✅ Idea generated — "${opts.projectTitle}"`)
    lines.push(`${opts.themeCount} theme${opts.themeCount === 1 ? '' : 's'} created`)
  } else {
    lines.push(`❌ Idea generation failed — "${opts.projectTitle}"`)
    if (opts.error) lines.push(opts.error)
  }

  lines.push('')
  lines.push('Research sources:')
  for (const status of opts.sourceStatuses) {
    lines.push(`• ${formatSourceStatusLine(status)}`)
  }

  return lines.join('\n')
}
