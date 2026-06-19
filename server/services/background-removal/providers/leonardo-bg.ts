import type { IBgRemovalProvider, BgRemovalOptions, BgRemovalResult } from '../types'
import {
    buildLeonardoHeaders,
    extractLeonardoImageUrl,
    extractLeonardoJobId,
    getErrorMessage,
    getLeonardoApiBase,
    pollLeonardoVariationImageUrl,
    uploadInitImageToLeonardo,
} from '~~/server/utils/leonardo'

const LEONARDO_API_BASE = getLeonardoApiBase()

export class LeonardoBgProvider implements IBgRemovalProvider {
    readonly name = 'leonardo' as const
    private apiKey: string

    constructor(apiKey: string) {
        this.apiKey = apiKey
    }

    async removeBackground(imageUrl: string, options?: BgRemovalOptions): Promise<BgRemovalResult> {
        const outputUrl = await this.createNoBgVariation(imageUrl)

        // Download the resulting image and return as Base64 to match standard return type
        const outputRes = await fetch(outputUrl)
        if (!outputRes.ok) {
            throw new Error(`Failed to download Leonardo background-removed image: ${outputRes.statusText}`)
        }

        const outputBufferRaw = await outputRes.arrayBuffer()
        const buffer = Buffer.from(outputBufferRaw)
        const base64 = buffer.toString('base64')
        const mimeType = outputRes.headers.get('content-type') || 'image/png'

        return {
            imageUrl: `data:${mimeType};base64,${base64}`,
            provider: 'leonardo',
            status: 'completed',
        }
    }

    private async createNoBgVariation(imageUrl: string): Promise<string> {
        const headers = buildLeonardoHeaders(this.apiKey)

        // Leonardo /variations/nobg requires { id } where `id` is a Leonardo image UUID —
        // the previous { image_url } body always failed. If the source URL is a Leonardo
        // CDN URL we can extract the UUID directly; otherwise we upload the image as an
        // init image first (see fallback below) to obtain one.
        const attempts: Array<{ body: Record<string, any>; label: string }> = []

        const leonardoUuid = this.extractLeonardoUuid(imageUrl)
        if (leonardoUuid) {
            attempts.push({ body: { id: leonardoUuid, isVariation: false }, label: `id(${leonardoUuid})` })
            attempts.push({ body: { id: leonardoUuid }, label: `id-bare(${leonardoUuid})` })
        }

        const errors: string[] = []

        for (const { body, label } of attempts) {
            try {
                const response = await $fetch<any>(`${LEONARDO_API_BASE}/variations/nobg`, {
                    method: 'POST',
                    headers,
                    body,
                })

                const directUrl = extractLeonardoImageUrl(response)
                if (directUrl) return directUrl

                const variationId = extractLeonardoJobId(response)
                if (!variationId) {
                    throw new Error('Leonardo no-bg response did not include a variation id or url')
                }

                return await pollLeonardoVariationImageUrl(this.apiKey, variationId)
            } catch (error) {
                errors.push(`${label}: ${getErrorMessage(error)}`)
            }
        }

        // Last resort: upload to Leonardo as init image, then try nobg with that id
        try {
            const uploadedId = await this.uploadAndGetInitId(imageUrl)
            const response = await $fetch<any>(`${LEONARDO_API_BASE}/variations/nobg`, {
                method: 'POST',
                headers,
                body: { id: uploadedId, isVariation: false },
            })

            const directUrl = extractLeonardoImageUrl(response)
            if (directUrl) return directUrl

            const variationId = extractLeonardoJobId(response)
            if (!variationId) {
                throw new Error('Leonardo no-bg response did not include a variation id or url')
            }

            return await pollLeonardoVariationImageUrl(this.apiKey, variationId)
        } catch (error) {
            errors.push(`init-upload: ${getErrorMessage(error)}`)
        }

        throw new Error(`Leonardo background removal failed: ${errors.join(' | ')}`)
    }

    private extractLeonardoUuid(input: string): string | null {
        const uuidMatch = input.match(/leonardo[.\-/].*?([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/i)
        return uuidMatch?.[1] ?? null
    }

    private async uploadAndGetInitId(imageUrl: string): Promise<string> {
        const imageRes = await fetch(imageUrl)
        if (!imageRes.ok) {
            throw new Error(`Failed to download image for Leonardo bg removal: ${imageRes.statusText}`)
        }

        const imageBuffer = Buffer.from(await imageRes.arrayBuffer())
        if (imageBuffer.length === 0) {
            throw new Error('Downloaded image is empty — source URL may have expired')
        }

        const extension = imageUrl.match(/\.(jpe?g|png|webp)/i)?.[1]?.replace('jpeg', 'jpg') ?? 'png'

        return await uploadInitImageToLeonardo(this.apiKey, imageBuffer, extension)
    }

    isConfigured(): boolean {
        return !!this.apiKey
    }
}
