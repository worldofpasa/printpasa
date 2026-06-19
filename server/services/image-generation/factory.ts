import type { ImageProvider } from '~~/shared/types/providers'
import type { IImageProvider } from './types'
import { KreaProvider } from './providers/krea'
import { FalProvider } from './providers/fal'

export function createImageProvider(provider: ImageProvider, apiKey: string, model?: string): IImageProvider {
  switch (provider) {
    case 'krea':
      return new KreaProvider(apiKey)
    case 'fal':
      return new FalProvider(apiKey, model)
    default:
      throw new Error(`Unknown image provider: ${provider}`)
  }
}
