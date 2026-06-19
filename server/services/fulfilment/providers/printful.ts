import type { ProductCreateRequest, ProductCreateResponse, ProductPublishResponse, Blueprint, BlueprintVariant } from '../types'
import { BaseFulfillmentProvider } from '../base'

// Stub implementation for future Printful support
export class PrintfulProvider extends BaseFulfillmentProvider {
  readonly name = 'printful' as const

  async getBlueprints(): Promise<Blueprint[]> {
    throw new Error('Printful integration coming soon')
  }

  async getBlueprintVariants(_blueprintId: string): Promise<BlueprintVariant[]> {
    throw new Error('Printful integration coming soon')
  }

  async createProduct(_request: ProductCreateRequest): Promise<ProductCreateResponse> {
    throw new Error('Printful integration coming soon')
  }

  async publishProduct(_externalProductId: string): Promise<ProductPublishResponse> {
    throw new Error('Printful integration coming soon')
  }

  async uploadImage(_imageUrl: string): Promise<{ imageId: string }> {
    throw new Error('Printful integration coming soon')
  }
}
