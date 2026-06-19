import type { FulfillmentProvider } from '~~/shared/types/providers'
import type { IFulfillmentProvider } from './types'
import { PrintifyProvider } from './providers/printify'
import { PrintfulProvider } from './providers/printful'

export function createFulfillmentProvider(
  provider: FulfillmentProvider,
  apiKey: string,
  options?: { shopId?: string },
): IFulfillmentProvider {
  switch (provider) {
    case 'printify':
      return new PrintifyProvider(apiKey, options?.shopId)
    case 'printful':
      return new PrintfulProvider(apiKey)
    default:
      throw new Error(`Unknown fulfillment provider: ${provider}`)
  }
}
