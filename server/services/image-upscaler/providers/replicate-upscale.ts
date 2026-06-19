import type { IUpscaleProvider, UpscaleOptions, UpscaleResult } from '../types'

const REPLICATE_API_BASE = 'https://api.replicate.com/v1'
const REPLICATE_REAL_ESRGAN_MODEL = 'nightmareai/real-esrgan'

interface ReplicatePredictionResponse {
  id: string
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled'
  output?: string | string[] | null
  error?: string | null
}

function extractOutputUrl(output: unknown): string | null {
  if (typeof output === 'string' && output.length > 0) return output
  if (Array.isArray(output) && typeof output[0] === 'string') return output[0]
  return null
}

export class ReplicateUpscaleProvider implements IUpscaleProvider {
  readonly name = 'replicate' as const
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async upscale(imageUrl: string, options?: UpscaleOptions): Promise<UpscaleResult> {
    const scaleFactor = options?.scaleFactor ?? 2

    const prediction = await $fetch<ReplicatePredictionResponse>(
      `${REPLICATE_API_BASE}/models/${REPLICATE_REAL_ESRGAN_MODEL}/predictions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${this.apiKey}`,
          'Content-Type': 'application/json',
          Prefer: 'wait=60',
        },
        body: {
          input: {
            image: imageUrl,
            scale: scaleFactor,
            face_enhance: false,
          },
        },
      },
    )

    const initialUrl = extractOutputUrl(prediction.output)
    if (prediction.status === 'succeeded' && initialUrl) {
      return {
        imageUrl: initialUrl,
        width: options?.sourceWidth ? options.sourceWidth * scaleFactor : 0,
        height: options?.sourceHeight ? options.sourceHeight * scaleFactor : 0,
        provider: 'replicate',
      }
    }

    if (!prediction.id) {
      throw new Error('Replicate did not return a prediction id')
    }

    const resultUrl = await this.pollPrediction(prediction.id)

    return {
      imageUrl: resultUrl,
      width: options?.sourceWidth ? options.sourceWidth * scaleFactor : 0,
      height: options?.sourceHeight ? options.sourceHeight * scaleFactor : 0,
      provider: 'replicate',
    }
  }

  private async pollPrediction(predictionId: string): Promise<string> {
    const pollIntervalMs = 2000
    const maxAttempts = 45

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await $fetch<ReplicatePredictionResponse>(`${REPLICATE_API_BASE}/predictions/${predictionId}`, {
        headers: {
          Authorization: `Token ${this.apiKey}`,
        },
      })

      const outputUrl = extractOutputUrl(status.output)
      if (status.status === 'succeeded' && outputUrl) {
        return outputUrl
      }

      if (status.status === 'failed' || status.status === 'canceled') {
        throw new Error(status.error ?? `Replicate prediction ${status.status}`)
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
    }

    throw new Error('Replicate upscale timed out after 90 seconds')
  }

  isConfigured(): boolean {
    return !!this.apiKey
  }
}
