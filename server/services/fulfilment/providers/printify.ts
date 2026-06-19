import type { Blueprint, BlueprintDetail, BlueprintVariant, IFulfillmentProvider, ProductCreateRequest, ProductCreateResponse, ProductPublishResponse } from '../types'
import { BaseFulfillmentProvider } from '../base'
import { resolveColor } from './color-map'
import { generateVariantSKU } from '../../sku/generator'

const PRINTIFY_API = 'https://api.printify.com/v1'

export class PrintifyProvider extends BaseFulfillmentProvider {
  readonly name = 'printify' as const
  private shopId: string

  constructor(apiKey: string, shopId?: string) {
    super(apiKey)
    this.shopId = shopId ?? ''
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    }
  }

  async getShopId(): Promise<string> {
    if (this.shopId) return this.shopId

    const shops = await $fetch<Array<{ id: number; title: string }>>(
      `${PRINTIFY_API}/shops.json`,
      { headers: this.headers() },
    )

    if (!shops.length) {
      throw new Error('No Printify shops found. Please create a shop first.')
    }

    this.shopId = String(shops[0]!.id)
    return this.shopId
  }

  async getBlueprints(): Promise<Blueprint[]> {
    const blueprints = await $fetch<Array<{
      id: number
      title: string
      description: string
      images: string[]
    }>>(`${PRINTIFY_API}/catalog/blueprints.json`, {
      headers: this.headers(),
    })

    return blueprints.slice(0, 20).map((bp) => ({
      id: String(bp.id),
      title: bp.title,
      description: bp.description,
      imageUrl: bp.images[0] ?? '',
      printProviderId: '',
    }))
  }

  // Fetch ALL blueprints from the Printify catalog in a single API call.
  // The catalog response includes brand + model fields directly, so brandName is
  // composed here — no per-blueprint requests needed.
  async syncAllBlueprints(): Promise<BlueprintDetail[]> {
    const blueprints = await $fetch<Array<{
      id: number
      title: string
      description: string
      brand?: string   // e.g. "Bella + Canvas"
      model?: string   // e.g. "3001"
      images: string[]
    }>>(`${PRINTIFY_API}/catalog/blueprints.json`, { headers: this.headers() })

    return blueprints.map((bp) => {
      let brandName: string | null = null
      if (bp.brand && bp.model) brandName = `${bp.brand} ${bp.model}`
      else if (bp.brand) brandName = bp.brand

      return {
        id: String(bp.id),
        title: bp.title,
        description: bp.description,
        imageUrl: bp.images[0] ?? '',
        printProviderId: '',
        brandName,
        basePrice: null,  // not available from catalog list endpoint
      } satisfies BlueprintDetail
    })
  }

  // Fetch brand name, imageUrl, and attempt base price for a single blueprint.
  // Called when adding a blueprint to the curated catalog (or backfilling old items).
  // Uses the single-blueprint detail endpoint to get brand+model+images, which is the
  // same data structure as the list but for one item — no print_providers call needed.
  async enrichBlueprintDetail(blueprintId: string): Promise<{
    title: string | null
    brandName: string | null
    basePrice: number | null
    imageUrl: string | null
    previewImageUrl: string | null
    allImages: string[]
  }> {
    try {
      const bp = await $fetch<{
        id: number
        title?: string
        brand?: string
        model?: string
        images?: string[]
      }>(`${PRINTIFY_API}/catalog/blueprints/${blueprintId}.json`, { headers: this.headers() })

      let brandName: string | null = null
      if (bp.brand && bp.model) brandName = `${bp.brand} ${bp.model}`
      else if (bp.brand) brandName = bp.brand

      const images = bp.images ?? []
      const imageUrl = images[0] ?? null

      // Try to auto-pick the best preview image: skip obvious placeholder mockups
      // ("YOUR DESIGN HERE") which Printify puts at the end of the array.
      // Prefer images[1] or images[2] — typically cleaner lifestyle or flat shots
      // compared to images[0] (heavily styled) or images[-1] (placeholder mockup).
      const candidateIndices = [1, 2, 0, images.length - 2, images.length - 1].filter(
        (i, _, arr) => i >= 0 && i < images.length && arr.indexOf(i) === arr.indexOf(i),
      )
      const previewImageUrl = candidateIndices
        .map(i => images[i])
        .find(url => url != null) ?? imageUrl

      return {
        title: bp.title ?? null,
        brandName,
        basePrice: null,
        imageUrl,
        previewImageUrl,
        allImages: images,
      }
    } catch {
      return { title: null, brandName: null, basePrice: null, imageUrl: null, previewImageUrl: null, allImages: [] }
    }
  }

  async getBlueprintVariants(blueprintId: string): Promise<BlueprintVariant[]> {
    // 1. Get print providers for this blueprint
    const printProviders = await $fetch<Array<{ id: number; title: string }>>(
      `${PRINTIFY_API}/catalog/blueprints/${blueprintId}/print_providers.json`,
      { headers: this.headers() },
    )
    const providerId = printProviders[0]?.id
    if (!providerId) return []

    // 2. Get variants — Printify returns color as a plain string, not { hex, title }
    const variantData = await $fetch<{
      variants: Array<{
        id: number
        title: string
        options: {
          color?: string
        }
      }>
    }>(`${PRINTIFY_API}/catalog/blueprints/${blueprintId}/print_providers/${providerId}/variants.json`, {
      headers: this.headers(),
    })

    // Deduplicate by color name (lowercased) to get unique color list
    const uniqueColors = new Map<string, BlueprintVariant>()
    for (const v of variantData.variants) {
      const colorName = v.options?.color
      if (colorName) {
        const key = colorName.toLowerCase()
        if (!uniqueColors.has(key)) {
          const { hex, isApproximate } = resolveColor(colorName)
          uniqueColors.set(key, {
            id: String(v.id),
            title: v.title,
            colorHex: hex,
            colorName,
            isApproximate,
          })
        }
      }
    }

    return Array.from(uniqueColors.values())
  }

  async uploadImage(imageUrl: string): Promise<{ imageId: string }> {
    const isBase64 = imageUrl.startsWith('data:image')
    const body: any = { file_name: `design-${Date.now()}.png` }

    if (isBase64) {
      body.contents = imageUrl.split(',')[1]
    } else {
      body.url = imageUrl
    }

    const response = await $fetch<{ id: string }>(`${PRINTIFY_API}/uploads/images.json`, {
      method: 'POST',
      headers: this.headers(),
      body,
    })

    return { imageId: response.id }
  }

  async createProduct(request: ProductCreateRequest): Promise<ProductCreateResponse> {
    const shopId = await this.getShopId()
    const { imageId } = await this.uploadImage(request.imageUrl)

    const printProviders = await $fetch<Array<{ id: number; title: string }>>(
      `${PRINTIFY_API}/catalog/blueprints/${request.blueprintId}/print_providers.json`,
      { headers: this.headers() },
    )

    if (!printProviders.length) throw new Error('No print providers found for this blueprint')
    const printProviderId = request.printProviderId || String(printProviders[0]!.id)

    const variantData = await $fetch<{
      variants: Array<{ id: number; title: string; options: { color?: string; size?: string } }>
    }>(`${PRINTIFY_API}/catalog/blueprints/${request.blueprintId}/print_providers/${printProviderId}/variants.json`, {
      headers: this.headers(),
    })

    // Filter variants to only selected colors. Honor the full explicit selection — a size cap
    // would silently drop color/size combinations the user picked.
    let filteredVariants = variantData.variants

    if (request.selectedColorNames && request.selectedColorNames.length > 0) {
      const selectedLower = new Set(
        request.selectedColorNames.map(c => c.trim().toLowerCase()),
      )
      filteredVariants = variantData.variants.filter(v => {
        const color = v.options?.color?.trim().toLowerCase()
        return !!color && selectedLower.has(color)
      })

      const matchedColors = new Set(filteredVariants.map(v => v.options?.color?.trim().toLowerCase()))
      const missing = [...selectedLower].filter(c => !matchedColors.has(c))
      if (missing.length > 0) {
        console.warn(
          `[printify] selected colors with no matching variants: ${missing.join(', ')} ` +
          `(available: ${[...new Set(variantData.variants.map(v => v.options?.color))].filter(Boolean).join(', ')})`,
        )
      }
    } else if (request.maxVariants && request.maxVariants > 0) {
      // No explicit color selection — cap to prevent accidentally creating a 50-variant product.
      filteredVariants = filteredVariants.slice(0, request.maxVariants)
    }

    if (filteredVariants.length === 0) {
      throw new Error('No matching variants found for selected colors')
    }

    type PrintifyProduct = {
      id: string
      images?: Array<{
        src: string
        variant_ids?: number[]
        position?: string
        is_default?: boolean
      }>
    }

    const defaultLower = request.defaultColorName?.trim().toLowerCase()
    // Printify only accepts one is_default=true variant. Pick the first variant of the
    // default color (if supplied and present), otherwise the first variant overall.
    let defaultIdx = defaultLower
      ? filteredVariants.findIndex(v => v.options?.color?.trim().toLowerCase() === defaultLower)
      : -1
    if (defaultIdx < 0) defaultIdx = 0

    const variantsPayload = filteredVariants.map((v, i) => {
      const color = v.options?.color
      // Some blueprints encode size in title (e.g. "S / Black") rather than options.size.
      const size = v.options?.size ?? (v.title && color ? v.title.split('/').map(s => s.trim()).find(p => p.toLowerCase() !== color.toLowerCase()) : undefined)
      return {
        id: v.id,
        price: request.variants?.find((rv) => rv.variantId === String(v.id))?.price ?? 2499,
        is_enabled: true,
        is_default: i === defaultIdx,
        ...(request.sku ? { sku: generateVariantSKU(request.sku, { color, size, variantId: v.id }) } : {}),
      }
    })

    let product: PrintifyProduct
    try {
      product = await $fetch<PrintifyProduct>(
        `${PRINTIFY_API}/shops/${shopId}/products.json`,
        {
          method: 'POST',
          headers: this.headers(),
          body: {
            title: request.title,
            description: request.description,
            tags: request.tags,
            blueprint_id: Number(request.blueprintId),
            print_provider_id: Number(printProviderId),
            variants: variantsPayload,
            print_areas: [
              {
                variant_ids: filteredVariants.map((v) => v.id),
                placeholders: [
                  {
                    position: 'front',
                    images: [{ id: imageId, x: 0.5, y: 0.5, scale: 1, angle: 0 }],
                  },
                ],
              },
            ],
          },
        },
      )
    } catch (err: any) {
      const msg = err.data ? JSON.stringify(err.data) : err.message
      throw new Error(`Printify Error: ${msg}`)
    }

    // Mockups may not be ready in the initial response — poll once after a short delay.
    let images = product.images ?? []
    if (images.length === 0) {
      await new Promise((r) => setTimeout(r, 2500))
      try {
        const refetched = await $fetch<PrintifyProduct>(
          `${PRINTIFY_API}/shops/${shopId}/products/${product.id}.json`,
          { headers: this.headers() },
        )
        images = refetched.images ?? []
      } catch {
        // best-effort; ignore
      }
    }

    const mockupImages = images.map((img) => ({
      src: img.src,
      variantIds: (img.variant_ids ?? []).map(String),
      position: img.position,
      isDefault: img.is_default,
    }))

    return {
      externalProductId: product.id,
      provider: 'printify',
      status: 'created',
      mockupImages,
    }
  }

  async publishProduct(externalProductId: string): Promise<ProductPublishResponse> {
    const shopId = await this.getShopId()

    try {
      await $fetch(
        `${PRINTIFY_API}/shops/${shopId}/products/${externalProductId}/publish.json`,
        {
          method: 'POST',
          headers: this.headers(),
          body: {
            title: true,
            description: true,
            images: true,
            variants: true,
            tags: true,
          },
        },
      )

      return { success: true, externalProductId }
    } catch (error: any) {
      return {
        success: false,
        externalProductId,
        errorMessage: error.message ?? 'Failed to publish product',
      }
    }
  }
}
