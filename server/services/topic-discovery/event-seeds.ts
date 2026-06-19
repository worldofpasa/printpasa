import type { HolidayDefinition } from '~~/server/services/pipeline/holidays'
import type { TopicSeed } from './types'

function daysUntilHoliday(h: HolidayDefinition, now: Date): number {
  const year = now.getFullYear()
  const [m, d] = h.holidayDate.split('-').map(Number)
  let target = new Date(year, m! - 1, d!)
  if (target < now) {
    target = new Date(year + 1, m! - 1, d!)
  }
  return Math.ceil((target.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
}

export function sortHolidaysByNearest(holidays: HolidayDefinition[], now: Date): HolidayDefinition[] {
  return [...holidays].sort((a, b) => daysUntilHoliday(a, now) - daysUntilHoliday(b, now))
}

export function buildEventSeed(holiday: HolidayDefinition): TopicSeed {
  const ideaDescription = [
    `Create print-on-demand t-shirt design ideas for ${holiday.name}.`,
    `Target gift buyers and people celebrating ${holiday.name} (${holiday.holidayDate}).`,
    'Focus on identity-signaling humor, niche communities, and commercially viable POD themes.',
    'Avoid generic slogans; prefer specific in-jokes and passionate subcultures tied to the holiday.',
  ].join(' ')

  return {
    ideaDescription,
    projectName: `${holiday.name} POD Designs`,
    source: 'event',
    sourceMeta: { holidayId: holiday.id },
  }
}

export function buildEventSeeds(holidays: HolidayDefinition[], now: Date): TopicSeed[] {
  return sortHolidaysByNearest(holidays, now).map(buildEventSeed)
}
