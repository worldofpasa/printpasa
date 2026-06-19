import type { WorkflowStage } from './workflow'
import type { AIProvider, ImageProvider, FulfillmentProvider, TrendSource, Niche } from './providers'

export type ProjectOriginSource = 'portal' | 'telegram' | 'cron'

export interface Project {
  id: string
  userId: string
  name: string
  slug: string
  description: string | null
  currentStage: WorkflowStage
  trendSource: TrendSource | null
  niche: Niche | null
  customNiche: string | null
  themeCount: number
  aiProvider: AIProvider | null
  imageProvider: ImageProvider | null
  fulfillmentProvider: FulfillmentProvider | null
  status: 'active' | 'completed' | 'archived'
  originSource: ProjectOriginSource
  originActor: string | null
  originMeta: string | null
  researchSnapshot: string | null
  validationSnapshot: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateProjectInput {
  name: string
  description?: string
  trendSource?: TrendSource
  niche?: Niche
  customNiche?: string
  themeCount?: number
  aiProvider?: AIProvider
  imageProvider?: ImageProvider
  fulfillmentProvider?: FulfillmentProvider
}
