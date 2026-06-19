import sharp from 'sharp'
import type { IUpscaleProvider, UpscaleOptions, UpscaleResult } from '../types'

/**
 * Local upscaler using sharp's lanczos3 resample — no ML, no API call.
 *
 * Preserves transparency perfectly (operates on RGBA directly) and never fails
 * on sparse-alpha inputs the way cloud ML upscalers do. Intended as the
 * "always works" option for t-shirt print output at 300 DPI, where the lack of
 * ML detail enhancement is acceptable for small print areas.
 *
 * Accepts any scale factor 1-8. No external state, no credentials.
 */
export class LocalUpscaleProvider implements IUpscaleProvider {
  readonly name = 'local' as const

  constructor(_apiKey?: string) {
    // No credentials needed; accept (and ignore) the arg to match the factory signature.
  }

  async upscale(imageUrl: string, options?: UpscaleOptions): Promise<UpscaleResult> {
    const scaleFactor = options?.scaleFactor ?? 4
    if (scaleFactor < 1 || scaleFactor > 8) {
      throw new Error(`Local upscale factor must be 1-8, got ${scaleFactor}`)
    }

    const imageRes = await fetch(imageUrl)
    if (!imageRes.ok) {
      throw new Error(`Failed to fetch source image: ${imageRes.statusText}`)
    }
    const inputBuffer = Buffer.from(await imageRes.arrayBuffer())

    const meta = await sharp(inputBuffer).metadata()
    const srcW = meta.width ?? options?.sourceWidth ?? 0
    const srcH = meta.height ?? options?.sourceHeight ?? 0
    if (!srcW || !srcH) throw new Error('Source image has no readable dimensions')

    const targetW = Math.round(srcW * scaleFactor)
    const targetH = Math.round(srcH * scaleFactor)

    const upscaled = await sharp(inputBuffer)
      .resize(targetW, targetH, { kernel: 'lanczos3', withoutEnlargement: false })
      .png()
      .toBuffer()

    const base64 = upscaled.toString('base64')

    return {
      imageUrl: `data:image/png;base64,${base64}`,
      width: targetW,
      height: targetH,
      provider: 'local',
    }
  }

  isConfigured(): boolean {
    return true
  }
}
