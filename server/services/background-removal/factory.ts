import { KreaBgProvider } from './providers/krea-bg'
import { PhotoroomBgProvider } from './providers/photoroom-bg'
import { LeonardoBgProvider } from './providers/leonardo-bg'
import { BriaBgProvider } from './providers/bria-bg'
import { LocalBgProvider } from './providers/local-bg'
import type { BgRemovalProvider, IBgRemovalProvider } from './types'

export function createBgRemovalProvider(providerType: BgRemovalProvider, apiKey?: string): IBgRemovalProvider {
    // Credential-free providers (must be handled before the apiKey guard).
    if (providerType === 'local-bg') return new LocalBgProvider()

    if (!apiKey) {
        throw new Error(`API key is required for provider: ${providerType}`)
    }

    switch (providerType) {
        case 'krea':
            return new KreaBgProvider(apiKey)
        case 'photoroom':
            return new PhotoroomBgProvider(apiKey)
        case 'leonardo':
            return new LeonardoBgProvider(apiKey)
        case 'bria':
            return new BriaBgProvider(apiKey)
        default:
            throw new Error(`Unsupported background removal provider: ${providerType}`)
    }
}
