export type BgRemovalProvider = 'photoroom' | 'leonardo' | 'bria' | 'local-bg'

export interface BgRemovalOptions {
    method?: string
}

export interface BgRemovalResult {
    imageUrl: string
    provider: string
    status: 'completed' | 'processing' | 'failed'
}

export interface IBgRemovalProvider {
    name: BgRemovalProvider
    removeBackground(imageUrl: string, options?: BgRemovalOptions): Promise<BgRemovalResult>
    isConfigured(): boolean
}

export const BG_REMOVAL_PROVIDERS: BgRemovalProvider[] = ['photoroom', 'leonardo', 'bria', 'local-bg']
