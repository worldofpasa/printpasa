import type { ImageProvider } from './providers'

export type DesignLane = 'graphic' | 'hybrid'

export interface ImagePrompt {
  id: string
  themeId: string
  promptText: string
  originalPromptText: string
  style: string | null
  designLane: DesignLane | null
  sloganText: string | null
  recommendedModel: string | null
  sortOrder: number
  isSelected: boolean
  createdAt: Date
}

export interface GeneratedImage {
  id: string
  promptId: string
  imageUrl: string
  thumbnailUrl: string | null
  imageProvider: ImageProvider
  width: number | null
  height: number | null
  dpi: number
  fileSize: number | null
  mimeType: string
  title: string | null
  description: string | null
  generationStatus: 'pending' | 'generating' | 'completed' | 'failed'
  providerJobId: string | null
  errorMessage: string | null
  isSelected: boolean
  metadata: Record<string, unknown> | null
  createdAt: Date
}
