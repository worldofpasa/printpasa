import type { IUpscaleProvider, UpscaleProvider } from './types'
import { LeonardoUpscaleProvider } from './providers/leonardo-upscale'
import { PhotoroomUpscaleProvider } from './providers/photoroom-upscale'
import { ReplicateUpscaleProvider } from './providers/replicate-upscale'
import { TopazUpscaleProvider } from './providers/topaz-upscale'
import { LocalUpscaleProvider } from './providers/local-upscale'

export function createUpscaleProvider(provider: UpscaleProvider, apiKey: string): IUpscaleProvider {
  switch (provider) {
    case 'leonardo':
      return new LeonardoUpscaleProvider(apiKey)
    case 'photoroom':
      return new PhotoroomUpscaleProvider(apiKey)
    case 'replicate':
      return new ReplicateUpscaleProvider(apiKey)
    case 'topaz':
      return new TopazUpscaleProvider(apiKey)
    case 'local':
      return new LocalUpscaleProvider(apiKey)
    default:
      throw new Error(`Unknown upscale provider: ${provider}`)
  }
}
