export type TopicSeedSource = 'event' | 'google-trends' | 'searchapi-trends'

export interface TopicSeed {
  ideaDescription: string
  projectName: string
  source: TopicSeedSource
  sourceMeta: {
    holidayId?: string
    trendQuery?: string
    nicheSlug?: string
    rank?: number
  }
}

export type DiscoveryMode = 'auto' | 'event' | 'daily'

export interface DiscoverTopicsOpts {
  scheduleId?: string
  discoveryMode?: DiscoveryMode
  maxJobs?: number
  avoidProjectNames?: string[]
}

export interface DiscoverTopicsResult {
  mode: 'event' | 'daily'
  seeds: TopicSeed[]
  stats: {
    candidates: number
    selected: number
    skippedDuplicates: number
  }
}
