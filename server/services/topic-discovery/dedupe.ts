import type { TopicSeed } from './types'

interface RecentProjectLike {
  name: string
  description?: string | null
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export function isDuplicateSeed(seed: TopicSeed, recent: RecentProjectLike[]): boolean {
  const seedName = normalize(seed.projectName)

  return recent.some((p) => {
    const name = normalize(p.name)

    if (name === seedName) return true
    if (name.includes(seedName) || seedName.includes(name)) return true
    return false
  })
}

export function dedupeSeeds(
  candidates: TopicSeed[],
  recent: RecentProjectLike[],
  max: number,
): { selected: TopicSeed[]; skippedDuplicates: number } {
  const selected: TopicSeed[] = []
  let skippedDuplicates = 0

  for (const seed of candidates) {
    if (selected.length >= max) break
    if (isDuplicateSeed(seed, recent)) {
      skippedDuplicates++
      continue
    }
    selected.push(seed)
  }

  return { selected, skippedDuplicates }
}
