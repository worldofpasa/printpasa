import { KreaProvider } from '../../image-generation/providers/krea'
import type { IBgRemovalProvider, BgRemovalOptions, BgRemovalResult } from '../types'

export class KreaBgProvider implements IBgRemovalProvider {
    readonly name = 'krea' as const
    private provider: KreaProvider

    constructor(apiKey: string) {
        this.provider = new KreaProvider(apiKey)
    }

    async removeBackground(imageUrl: string, options?: BgRemovalOptions): Promise<BgRemovalResult> {
        // We defer to KreaProvider's removeBackground if implemented. Assuming it's added there later.
        if ('removeBackground' in this.provider && typeof (this.provider as any).removeBackground === 'function') {
            const response = await (this.provider as any).removeBackground(imageUrl)
            return {
                imageUrl: response.imageUrl,
                provider: 'krea',
                status: response.status || 'completed'
            }
        }
        throw new Error('Krea background removal is not yet implemented.')
    }

    isConfigured(): boolean {
        return this.provider.isConfigured()
    }
}
