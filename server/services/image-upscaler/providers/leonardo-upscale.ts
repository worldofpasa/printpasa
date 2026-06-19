import type { IUpscaleProvider, UpscaleOptions, UpscaleResult } from '../types'
import {
  buildLeonardoHeaders,
  extractLeonardoImageUrl,
  extractLeonardoJobId,
  getErrorMessage,
  getLeonardoApiBase,
  pollLeonardoVariationImageUrl,
  uploadInitImageToLeonardo
} from '~~/server/utils/leonardo'

const LEONARDO_API_BASE = getLeonardoApiBase()

// Leonardo universal upscaler caps at 2x per pass.
// For higher factors we chain multiple 2x passes (e.g. 4x = 2x + 2x).
const MAX_SINGLE_PASS = 2

/**
 * Leonardo upscale provider using Universal Upscaler.
 * Accepts external images via init image upload.
 * NOTE: This is a generative upscaler — it may add backgrounds to transparent images.
 * For transparency-preserving upscale, use Photoroom instead.
 * Docs: https://docs.leonardo.ai/reference/createuniversalupscalerjob
 */
export class LeonardoUpscaleProvider implements IUpscaleProvider {
  readonly name = 'leonardo' as const
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async upscale(imageUrl: string, options?: UpscaleOptions): Promise<UpscaleResult> {
    const targetScale = options?.scaleFactor ?? 2
    const headers = buildLeonardoHeaders(this.apiKey)

    try {
      const passes = this.buildPassChain(targetScale)
      let currentUrl = imageUrl
      let cumulativeScale = 1

      for (const passScale of passes) {
        currentUrl = await this.runSinglePass(currentUrl, passScale, headers)
        cumulativeScale *= passScale
      }

      return {
        imageUrl: currentUrl,
        width: options?.sourceWidth ? Math.round(options.sourceWidth * cumulativeScale) : 0,
        height: options?.sourceHeight ? Math.round(options.sourceHeight * cumulativeScale) : 0,
        provider: 'leonardo',
      }
    } catch (error) {
      throw new Error(`Leonardo upscale failed: ${getErrorMessage(error)}`)
    }
  }

  /**
   * Break the desired scale factor into a chain of passes, each <= 2x.
   * e.g. 4 -> [2, 2], 3 -> [2, 1.5], 2 -> [2], 1.5 -> [1.5]
   */
  private buildPassChain(targetScale: number): number[] {
    if (targetScale <= MAX_SINGLE_PASS) return [targetScale]

    const passes: number[] = []
    let remaining = targetScale
    while (remaining > MAX_SINGLE_PASS) {
      passes.push(MAX_SINGLE_PASS)
      remaining /= MAX_SINGLE_PASS
    }
    if (remaining > 1) {
      passes.push(remaining)
    }
    return passes
  }

  /**
   * Execute a single upscale pass via Leonardo universal upscaler.
   * Uses GENERAL style with minimal creativity to preserve the image faithfully.
   */
  private async runSinglePass(imageUrl: string, scaleFactor: number, headers: Record<string, string>): Promise<string> {
    const imageBuffer = await this.fetchImageBuffer(imageUrl)
    const initImageId = await uploadInitImageToLeonardo(this.apiKey, imageBuffer, 'png')

    const response = await $fetch<any>(`${LEONARDO_API_BASE}/variations/universal-upscaler`, {
      method: 'POST',
      headers,
      body: {
        initImageId,
        upscalerStyle: 'GENERAL',
        upscaleMultiplier: 2,
        creativityStrength: 1,
      },
    })

    const directUrl = extractLeonardoImageUrl(response)
    if (directUrl) return directUrl

    const variationId = extractLeonardoJobId(response)
    if (!variationId) {
      throw new Error('Leonardo universal upscaler did not return a variation id')
    }

    return await pollLeonardoVariationImageUrl(this.apiKey, variationId)
  }

  private async fetchImageBuffer(imageUrl: string): Promise<Buffer> {
    if (imageUrl.startsWith('data:')) {
      const b64Data = imageUrl.split(',')[1]
      if (!b64Data) throw new Error('Invalid data URI')
      return Buffer.from(b64Data, 'base64')
    }
    const res = await fetch(imageUrl)
    if (!res.ok) throw new Error(`Failed to fetch source image: ${res.statusText}`)
    return Buffer.from(await res.arrayBuffer())
  }

  isConfigured(): boolean {
    return !!this.apiKey
  }
}
