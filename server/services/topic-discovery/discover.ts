import { getActiveHolidays } from '~~/server/services/pipeline/holidays'
import { useDB } from '~~/server/database'
import { buildEventSeeds } from './event-seeds'
import { buildDailySeeds } from './daily-seeds'
import { dedupeSeeds } from './dedupe'
import type { DiscoverTopicsOpts, DiscoverTopicsResult, DiscoveryMode } from './types'

function resolveMode(
  configured: DiscoveryMode | undefined,
  hasActiveHolidays: boolean,
): 'event' | 'daily' {
  if (configured === 'event') return 'event'
  if (configured === 'daily') return 'daily'
  return hasActiveHolidays ? 'event' : 'daily'
}

export async function discoverTopics(opts: DiscoverTopicsOpts = {}): Promise<DiscoverTopicsResult> {
  const now = new Date()
  const maxJobs = opts.maxJobs ?? 3
  const activeHolidays = getActiveHolidays(now)
  const mode = resolveMode(opts.discoveryMode, activeHolidays.length > 0)

  const db = useDB()
  const recentProjects = await db.query.projects.findMany({
    orderBy: (projects, { desc }) => [desc(projects.createdAt)],
    limit: 50,
    columns: { name: true, description: true },
  })

  let candidates = mode === 'event'
    ? buildEventSeeds(activeHolidays, now)
    : await buildDailySeeds(maxJobs * 3)

  let effectiveMode: 'event' | 'daily' = mode

  if (candidates.length === 0 && mode === 'event') {
    console.warn('[topic-discovery] event mode had no active holidays; falling back to daily')
    candidates = await buildDailySeeds(maxJobs * 3)
    effectiveMode = 'daily'
  }

  const { selected, skippedDuplicates } = dedupeSeeds(candidates, recentProjects, maxJobs)

  console.log('[topic-discovery]', {
    scheduleId: opts.scheduleId,
    mode: effectiveMode,
    candidates: candidates.length,
    selected: selected.length,
    skippedDuplicates,
  })

  return {
    mode: effectiveMode,
    seeds: selected,
    stats: {
      candidates: candidates.length,
      selected: selected.length,
      skippedDuplicates,
    },
  }
}
