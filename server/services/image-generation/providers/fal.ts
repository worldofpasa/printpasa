import type { ImageGenerateRequest, ImageGenerateResponse } from '../types'
import { BaseImageProvider } from '../base'

export const DEFAULT_FAL_MODEL = 'fal-ai/flux/dev'

export class FalProvider extends BaseImageProvider {
  readonly name = 'fal' as const
  private readonly modelId: string

  constructor(apiKey: string, modelId?: string) {
    super(apiKey)
    this.modelId = modelId?.trim() || DEFAULT_FAL_MODEL
  }

  async generate(request: ImageGenerateRequest): Promise<ImageGenerateResponse> {
    const body: Record<string, unknown> = {
      prompt: request.prompt,
      image_size: {
        width: request.width ?? 1024,
        height: request.height ?? 1024,
      },
      num_images: 1,
      enable_safety_checker: true,
    }
    if (request.negativePrompt) {
      body.negative_prompt = request.negativePrompt
    }

    const response = await $fetch<{
      images: Array<{ url: string; width: number; height: number }>
    }>(`https://fal.run/${this.modelId}`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body,
    })

    const image = response.images?.[0]
    if (!image) throw new Error('No image returned from Fal')
    return {
      imageUrl: image.url,
      width: image.width,
      height: image.height,
      provider: 'fal',
      status: 'completed',
      metadata: { model: this.modelId },
    }
  }
}
