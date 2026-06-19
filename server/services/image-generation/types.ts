import type { ImageProvider } from '~~/shared/types/providers'

export interface ImageGenerateRequest {
  prompt: string
  width?: number
  height?: number
  dpi?: number
  style?: string
  negativePrompt?: string
}

export interface ImageGenerateResponse {
  imageUrl: string
  thumbnailUrl?: string
  width: number
  height: number
  provider: ImageProvider
  jobId?: string
  status: 'completed' | 'pending'
  metadata?: Record<string, unknown>
}

export interface ImageStatusResponse {
  jobId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  imageUrl?: string
  errorMessage?: string
}

export interface IImageProvider {
  readonly name: ImageProvider
  generate(request: ImageGenerateRequest): Promise<ImageGenerateResponse>
  checkStatus?(jobId: string): Promise<ImageStatusResponse>
  isConfigured(): boolean
}
