export interface ResearchPlan {
  projectTitle: string
  inferredAudience: string
  subreddits: string[]
  keywords: {
    google: string[]
    pinterest: string[]
    tiktok: string[]
  }
}

export type ResearchSignalSource = 'reddit' | 'google-trends' | 'pinterest' | 'tiktok'

export type SourceFetchStatus = 'success' | 'partial' | 'failed' | 'skipped'

export interface SourceStatus {
  source: ResearchSignalSource
  displayName: string
  status: SourceFetchStatus
  message?: string
  signalCount: number
}

export interface LabeledSignal {
  label: string
  source: ResearchSignalSource
  query: string
  title: string
  detail?: string
  score?: number
  url?: string
  error?: string
}

export interface ResearchBundle {
  ideaDescription: string
  plan: ResearchPlan
  signals: LabeledSignal[]
  sourceStatuses: SourceStatus[]
  warnings: string[]
  fetchedAt: string
}
