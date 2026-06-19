import type { IUpscaleProvider, UpscaleOptions, UpscaleResult } from '../types'

// Topaz Image API. Confirmed endpoint exists (api.topazlabs.com/image/v1/enhance
// returns 401 without auth). Exact request/response contract is gated behind
// the developer dashboard; the multipart-image + X-API-Key pattern below is
// inferred from Topaz's published examples and may need small adjustments
// (model name, scale param key, response shape) once an account is provisioned.
//
// Pricing reference: 1 credit per request up to 24MP output; larger outputs
// can require up to 16 credits. Defaults below target a 4x scale on a typical
// 1024×1024 source (≈16MP output) — well within 1 credit.

const TOPAZ_API_BASE = 'https://api.topazlabs.com/image/v1'
const DEFAULT_MODEL = 'Standard V2'

export class TopazUpscaleProvider implements IUpscaleProvider {
  readonly name = 'topaz' as const
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async upscale(imageUrl: string, options?: UpscaleOptions): Promise<UpscaleResult> {
    const scaleFactor = options?.scaleFactor ?? 4

    const imageRes = await fetch(imageUrl)
    if (!imageRes.ok) {
      throw new Error(`Failed to fetch source image: ${imageRes.statusText}`)
    }
    const imageBlob = await imageRes.blob()

    const form = new FormData()
    form.append('image', imageBlob, 'source.png')
    form.append('model', DEFAULT_MODEL)
    form.append('scale', String(scaleFactor))
    form.append('output_format', 'png')

    const response = await fetch(`${TOPAZ_API_BASE}/enhance`, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
        Accept: 'image/png',
      },
      body: form,
    })

    if (!response.ok) {
      let errBody: any
      try { errBody = await response.json() } catch { /* binary or empty body */ }
      const detail = errBody?.message || errBody?.error || response.statusText
      throw new Error(`Topaz upscale failed (${response.status}): ${detail}`)
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    const base64 = buffer.toString('base64')
    const mimeType = response.headers.get('content-type') || 'image/png'

    return {
      imageUrl: `data:${mimeType};base64,${base64}`,
      width: options?.sourceWidth ? options.sourceWidth * scaleFactor : 0,
      height: options?.sourceHeight ? options.sourceHeight * scaleFactor : 0,
      provider: 'topaz',
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey
  }
}
