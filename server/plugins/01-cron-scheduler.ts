import { and, eq, isNull, lte, or } from 'drizzle-orm'
import { useDB, schema } from '~~/server/database'
import { getActiveHolidays } from '~~/server/services/pipeline/holidays'
import { runAutomatedResearch } from '~~/server/services/pipeline/brainstorm'

const CRON_TZ = process.env.CRON_TIMEZONE || 'UTC'

function getHourInTz(date: Date, tz: string): number {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false }).format(date))
}

function getMinuteInTz(date: Date, tz: string): number {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: tz, minute: 'numeric' }).format(date))
}

/** Next occurrence of `hour`:00 in CRON_TZ (default UTC). */
function getNextDailyAt(hour: number, tz = CRON_TZ): Date {
  const now = new Date()
  for (let ms = 60_000; ms <= 3 * 24 * 60 * 60_000; ms += 60_000) {
    const candidate = new Date(now.getTime() + ms)
    if (getHourInTz(candidate, tz) === hour && getMinuteInTz(candidate, tz) === 0) {
      return candidate
    }
  }
  throw new Error(`[cron-scheduler] could not compute next ${hour}:00 run in ${tz}`)
}

function calculateNextRunAt(interval: string): Date {
  const now = new Date()
  switch (interval) {
    case 'hourly':
      return new Date(now.getTime() + 60 * 60 * 1000)
    case 'daily-4am':
      return getNextDailyAt(4)
    case 'daily-6am':
      return getNextDailyAt(6)
    case 'daily-6pm':
      return getNextDailyAt(18)
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000)
    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000)
  }
}

type ScheduleSeed = {
  id: string
  name: string
  interval: string
  discoveryMode: 'daily' | 'event'
  niche?: string
  enabled?: boolean
}

const SCHEDULES: ScheduleSeed[] = [
  {
    id: 'discovery-daily-am',
    name: 'Daily Trend Discovery (6 AM)',
    interval: 'daily-6am',
    discoveryMode: 'daily',
    niche: 'general',
    enabled: false,
  },
  {
    id: 'discovery-daily-pm',
    name: 'Daily Trend Discovery (6 PM)',
    interval: 'daily-6pm',
    discoveryMode: 'daily',
    niche: 'general',
    enabled: false,
  },
  {
    id: 'events-holidays',
    name: 'Holiday & Event Discovery (4 AM)',
    interval: 'daily-4am',
    discoveryMode: 'event',
    niche: 'holiday',
    enabled: false,
  },
]

async function upsertSchedule(seed: ScheduleSeed) {
  const db = useDB()
  const existing = await db.query.pipelineSchedules.findFirst({
    where: eq(schema.pipelineSchedules.id, seed.id),
  })
  const nextRunAt = calculateNextRunAt(seed.interval)

  if (!existing) {
    await db.insert(schema.pipelineSchedules).values({
      id: seed.id,
      name: seed.name,
      interval: seed.interval,
      niche: seed.niche ?? 'general',
      source: 'reddit',
      discoveryMode: seed.discoveryMode,
      maxJobsPerRun: 3,
      enabled: seed.enabled ?? true,
      nextRunAt,
    })
    console.log(`[cron-scheduler] Seeded ${seed.id}, next run ${nextRunAt.toISOString()}`)
    return
  }

  await db
    .update(schema.pipelineSchedules)
    .set({
      name: seed.name,
      interval: seed.interval,
      niche: seed.niche ?? existing.niche,
      discoveryMode: seed.discoveryMode,
      // never overwrite enabled — preserve whatever the user toggled
      updatedAt: new Date(),
    })
    .where(eq(schema.pipelineSchedules.id, seed.id))
}

async function seedSchedules() {
  const db = useDB()

  for (const seed of SCHEDULES) {
    await upsertSchedule(seed)
  }

  // Retire legacy schedules replaced by discovery-daily-* / events-holidays
  for (const legacyId of ['daily-holidays', 'hourly-general']) {
    const legacy = await db.query.pipelineSchedules.findFirst({
      where: eq(schema.pipelineSchedules.id, legacyId),
    })
    if (legacy?.enabled) {
      await db
        .update(schema.pipelineSchedules)
        .set({ enabled: false, updatedAt: new Date() })
        .where(eq(schema.pipelineSchedules.id, legacyId))
      console.log(`[cron-scheduler] Disabled legacy schedule ${legacyId}`)
    }
  }
}

async function deferSchedule(scheduleId: string, interval: string, reason: string) {
  const db = useDB()
  const now = new Date()
  const nextRun = calculateNextRunAt(interval)
  await db
    .update(schema.pipelineSchedules)
    .set({ nextRunAt: nextRun, updatedAt: now })
    .where(eq(schema.pipelineSchedules.id, scheduleId))
  console.log(`[cron-scheduler] deferred "${scheduleId}" (${reason}). Next: ${nextRun.toISOString()}`)
}

async function tickScheduler() {
  const db = useDB()
  const now = new Date()

  const dueSchedules = await db.query.pipelineSchedules.findMany({
    where: and(
      eq(schema.pipelineSchedules.enabled, true),
      or(
        isNull(schema.pipelineSchedules.nextRunAt),
        lte(schema.pipelineSchedules.nextRunAt, now),
      ),
    ),
  })

  for (const sched of dueSchedules) {
    if (sched.discoveryMode === 'event' && getActiveHolidays(now).length === 0) {
      await deferSchedule(sched.id, sched.interval, 'no active holiday window')
      continue
    }

    const nextRun = calculateNextRunAt(sched.interval)
    const [claimed] = await db
      .update(schema.pipelineSchedules)
      .set({
        lastRunAt: now,
        nextRunAt: nextRun,
        updatedAt: now,
      })
      .where(and(
        eq(schema.pipelineSchedules.id, sched.id),
        eq(schema.pipelineSchedules.enabled, true),
        or(
          isNull(schema.pipelineSchedules.nextRunAt),
          lte(schema.pipelineSchedules.nextRunAt, now),
        ),
      ))
      .returning()

    if (claimed) {
      console.log(`[cron-scheduler] claimed "${sched.name}" (${sched.id}). Next: ${nextRun.toISOString()}`)
      void runAutomatedResearch(sched.id).catch((err) => {
        console.error(`[cron-scheduler] error running schedule "${sched.name}" (${sched.id}):`, err)
      })
    }
  }
}

export default defineNitroPlugin(() => {
  setTimeout(async () => {
    try {
      await seedSchedules()
      await tickScheduler()
    } catch (e) {
      console.error('[cron-scheduler] init error:', e)
    }

    setInterval(async () => {
      try {
        await tickScheduler()
      } catch (e) {
        console.error('[cron-scheduler] tick error:', e)
      }
    }, 60 * 1000)
  }, 5000)
})
