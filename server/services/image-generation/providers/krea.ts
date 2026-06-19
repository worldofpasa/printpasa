import { Krea } from '@krea-ai/sdk'
import type { ImageGenerateRequest, ImageGenerateResponse, ImageStatusResponse } from '../types'
import { BaseImageProvider } from '../base'

export class KreaProvider extends BaseImageProvider {
  readonly name = 'krea' as const
  private client: InstanceType<typeof Krea>

  constructor(apiKey: string) {
    super(apiKey)
    this.client = new Krea({ apiKey })
  }

  async generate(request: ImageGenerateRequest): Promise<ImageGenerateResponse> {
    const result = await this.client.subscribe('image/krea/krea-2/medium', {
      input: {
        prompt: request.prompt,
        aspect_ratio: '1:1',
        resolution: '1K',
      },
    })

    const imageUrl = result.data?.urls?.[0]
    if (!imageUrl) {
      throw new Error(`Krea generation returned no image URL. Job: ${result.job?.job_id}`)
    }

    return {
      imageUrl,
      width: 1024,
      height: 1024,
      provider: 'krea',
      jobId: result.job?.job_id ?? '',
      status: 'completed',
      metadata: { model: 'krea/krea-2/medium' },
    }
  }

  async checkStatus(jobId: string): Promise<ImageStatusResponse> {
    const job = await this.client.jobs.get(jobId)

    if (job.status === 'completed' && job.result?.urls?.[0]) {
      return { jobId, status: 'completed', imageUrl: job.result.urls[0] }
    }
    if (job.status === 'failed' || job.status === 'cancelled') {
      return { jobId, status: 'failed', errorMessage: `Krea job ${job.status}` }
    }
    return { jobId, status: 'processing' }
  }
}
