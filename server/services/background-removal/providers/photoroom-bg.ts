import type { IBgRemovalProvider, BgRemovalOptions, BgRemovalResult } from '../types'

export class PhotoroomBgProvider implements IBgRemovalProvider {
    readonly name = 'photoroom' as const
    private apiKey: string

    constructor(apiKey: string) {
        this.apiKey = apiKey
    }

    async removeBackground(imageUrl: string, options?: BgRemovalOptions): Promise<BgRemovalResult> {
        try {
            // Fetch the image as blob first
            const imageRes = await fetch(imageUrl)
            if (!imageRes.ok) {
                throw new Error(`Failed to fetch source image: ${imageRes.statusText}`)
            }

            const imageBlob = await imageRes.blob()
            const formData = new FormData()
            formData.append('image_file', imageBlob, 'image.png')

            const response = await fetch('https://sdk.photoroom.com/v1/segment', {
                method: 'POST',
                headers: {
                    'x-api-key': this.apiKey,
                },
                body: formData,
            })

            if (!response.ok) {
                let errBody
                try { errBody = await response.json() } catch { }
                throw new Error(errBody?.message || response.statusText)
            }

            // Convert the response image back directly to a Data URL temporarily
            // or we can stream it directly into S3?
            // For now we'll return a blob URL or base64 data string since we need to match imageUrl type
            // Wait, since we are Server Side, we can't create URL.createObjectURL.
            const buffer = Buffer.from(await response.arrayBuffer())
            const base64 = buffer.toString('base64')
            const mimeType = response.headers.get('content-type') || 'image/png'

            return {
                imageUrl: `data:${mimeType};base64,${base64}`,
                provider: 'photoroom',
                status: 'completed'
            }
        } catch (err: any) {
            throw new Error(`Photoroom API Error: ${err.message}`)
        }
    }

    isConfigured(): boolean {
        return !!this.apiKey
    }
}
