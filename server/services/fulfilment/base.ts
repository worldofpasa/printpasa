import type { FulfillmentProvider } from '~~/shared/types/providers'
import type { IFulfillmentProvider, ProductCreateRequest, ProductCreateResponse, ProductPublishResponse, Blueprint, BlueprintVariant } from './types'

export abstract class BaseFulfillmentProvider implements IFulfillmentProvider {
  abstract readonly name: FulfillmentProvider
  protected apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  abstract getBlueprints(): Promise<Blueprint[]>
  abstract getBlueprintVariants(blueprintId: string): Promise<BlueprintVariant[]>
  abstract createProduct(request: ProductCreateRequest): Promise<ProductCreateResponse>
  abstract publishProduct(externalProductId: string): Promise<ProductPublishResponse>
  abstract uploadImage(imageUrl: string): Promise<{ imageId: string }>

  isConfigured(): boolean {
    return !!this.apiKey
  }
}
