import type { ImageProvider } from '~~/shared/types/providers'
import type { IImageProvider, ImageGenerateRequest, ImageGenerateResponse, ImageStatusResponse } from './types'

export abstract class BaseImageProvider implements IImageProvider {
  abstract readonly name: ImageProvider
  protected apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  abstract generate(request: ImageGenerateRequest): Promise<ImageGenerateResponse>

  isConfigured(): boolean {
    return !!this.apiKey
  }
}
