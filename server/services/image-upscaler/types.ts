export const UPSCALE_PROVIDERS = ['leonardo', 'photoroom', 'replicate', 'topaz', 'local'] as const
export type UpscaleProvider = typeof UPSCALE_PROVIDERS[number]

export interface UpscaleOptions {
  scaleFactor?: number
  sourceWidth?: number
  sourceHeight?: number
}

export interface UpscaleResult {
  imageUrl: string
  width: number
  height: number
  provider: UpscaleProvider
}

export interface IUpscaleProvider {
  readonly name: UpscaleProvider
  upscale(imageUrl: string, options?: UpscaleOptions): Promise<UpscaleResult>
  isConfigured(): boolean
}
