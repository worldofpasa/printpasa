import type { FulfillmentProvider } from '~~/shared/types/providers'

export interface ProductCreateRequest {
  title: string
  description: string
  tags: string[]
  imageUrl: string
  blueprintId: string
  printProviderId: string
  variants?: ProductVariant[]
  selectedColorNames?: string[]
  defaultColorName?: string
  maxVariants?: number
  /** Base product SKU; if provided, variants are labeled `${sku}-COLOR-SIZE`. */
  sku?: string
}

export interface ProductVariant {
  variantId: string
  price: number
  isEnabled: boolean
}

export interface MockupImage {
  src: string
  variantIds: string[]
  position?: string
  isDefault?: boolean
}

export interface ProductCreateResponse {
  externalProductId: string
  provider: FulfillmentProvider
  status: 'created' | 'failed'
  previewUrl?: string
  mockupImages?: MockupImage[]
  errorMessage?: string
}

export interface ProductPublishResponse {
  success: boolean
  externalProductId: string
  publishedUrl?: string
  errorMessage?: string
}

export interface Blueprint {
  id: string
  title: string
  description: string
  imageUrl: string
  printProviderId: string
}

export interface BlueprintDetail extends Blueprint {
  brandName: string | null
  basePrice: number | null  // cents
}

export interface BlueprintVariant {
  id: string
  title: string
  colorHex: string
  colorName: string
  isApproximate?: boolean
}

export interface IFulfillmentProvider {
  readonly name: FulfillmentProvider
  getBlueprints(): Promise<Blueprint[]>
  getBlueprintVariants(blueprintId: string): Promise<BlueprintVariant[]>
  createProduct(request: ProductCreateRequest): Promise<ProductCreateResponse>
  publishProduct(externalProductId: string): Promise<ProductPublishResponse>
  uploadImage(imageUrl: string): Promise<{ imageId: string }>
  isConfigured(): boolean
}
