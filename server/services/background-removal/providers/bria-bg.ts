import type { IBgRemovalProvider, BgRemovalOptions, BgRemovalResult } from '../types'

// Bria background-removal endpoint. v1 is the stable, multipart-form path.
// See https://docs.bria.ai/image-editing/features/background/remove-background
const BRIA_API_URL = 'https://engine.prod.bria-api.com/v1/background/remove'

export class BriaBgProvider implements IBgRemovalProvider {
    readonly name = 'bria' as const
    private apiKey: string

    constructor(apiKey: string) {
        this.apiKey = apiKey
    }

    async removeBackground(imageUrl: string, _options?: BgRemovalOptions): Promise<BgRemovalResult> {
        try {
            const imageRes = await fetch(imageUrl)
            if (!imageRes.ok) {
                throw new Error(`Failed to fetch source image: ${imageRes.statusText}`)
            }

            const imageBlob = await imageRes.blob()
            const formData = new FormData()
            formData.append('file', imageBlob, 'image.png')

            const response = await fetch(BRIA_API_URL, {
                method: 'POST',
                headers: {
                    api_token: this.apiKey,
                },
                body: formData,
            })

            if (!response.ok) {
                let errBody: any
                try { errBody = await response.json() } catch { /* non-JSON error body */ }
                throw new Error(errBody?.message || errBody?.error || response.statusText)
            }

            const buffer = Buffer.from(await response.arrayBuffer())
            const base64 = buffer.toString('base64')
            const mimeType = response.headers.get('content-type') || 'image/png'

            return {
                imageUrl: `data:${mimeType};base64,${base64}`,
                provider: 'bria',
                status: 'completed',
            }
        } catch (err: any) {
            throw new Error(`Bria API Error: ${err.message}`)
        }
    }

    isConfigured(): boolean {
        return !!this.apiKey
    }
}
