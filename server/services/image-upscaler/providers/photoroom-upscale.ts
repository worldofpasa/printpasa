import type { IUpscaleProvider, UpscaleOptions, UpscaleResult } from '../types'
import sharp from 'sharp'

const PHOTOROOM_API_BASE = 'https://image-api.photoroom.com/v2/edit'

// Photoroom ai.fast max input: width * height <= 1,000,000 pixels
const MAX_INPUT_PIXELS = 1_000_000
const MAX_INPUT_SIDE = 1000

/**
 * Photoroom AI Upscale provider (Alpha).
 * Uses the /v2/edit endpoint with upscale.mode = ai.fast.
 * Always outputs PNG — preserves transparency/alpha channels.
 * Fixed 4x scaling. Max input: 1000x1000 for ai.fast.
 * Images larger than 1000x1000 are downscaled before sending.
 * Docs: https://docs.photoroom.com/image-editing-api-plus-plan/alpha-ai-upscale
 */
export class PhotoroomUpscaleProvider implements IUpscaleProvider {
  readonly name = 'photoroom' as const
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async upscale(imageUrl: string, options?: UpscaleOptions): Promise<UpscaleResult> {
    // Fetch the source image as a buffer
    const imageRes = await fetch(imageUrl)
    if (!imageRes.ok) {
      throw new Error(`Failed to fetch source image: ${imageRes.statusText}`)
    }
    let imageBuffer = Buffer.from(await imageRes.arrayBuffer())

    // Downscale if input exceeds 1000x1000 pixel limit
    const metadata = await sharp(imageBuffer).metadata()
    const srcW = metadata.width ?? 0
    const srcH = metadata.height ?? 0

    let inputW = srcW
    let inputH = srcH

    if (srcW * srcH > MAX_INPUT_PIXELS) {
      const scale = Math.sqrt(MAX_INPUT_PIXELS / (srcW * srcH))
      inputW = Math.floor(srcW * scale)
      inputH = Math.floor(srcH * scale)
      // Clamp each side to MAX_INPUT_SIDE
      if (inputW > MAX_INPUT_SIDE) inputW = MAX_INPUT_SIDE
      if (inputH > MAX_INPUT_SIDE) inputH = MAX_INPUT_SIDE

      imageBuffer = await sharp(imageBuffer)
        .resize(inputW, inputH, { fit: 'inside' })
        .png()
        .toBuffer()
    }

    const formData = new FormData()
    formData.append('imageFile', new Blob([imageBuffer], { type: 'image/png' }), 'image.png')
    formData.append('referenceBox', 'originalImage')
    formData.append('removeBackground', 'false')
    formData.append('upscale.mode', 'ai.fast')

    const response = await fetch(PHOTOROOM_API_BASE, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
      },
      body: formData,
    })

    if (!response.ok) {
      let errBody: string | undefined
      try { errBody = await response.text() } catch {}
      throw new Error(`Photoroom upscale failed (${response.status}): ${errBody || response.statusText}`)
    }

    // Response is the upscaled image as binary PNG
    const buffer = Buffer.from(await response.arrayBuffer())
    const base64 = buffer.toString('base64')
    const resultUrl = `data:image/png;base64,${base64}`

    // Photoroom always does 4x from the input size
    return {
      imageUrl: resultUrl,
      width: inputW * 4,
      height: inputH * 4,
      provider: 'photoroom',
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey
  }
}
