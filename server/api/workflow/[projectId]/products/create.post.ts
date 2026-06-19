import { useDB, schema } from '~~/server/database'
import { eq } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'
import { resolveWritableProjectById } from '~~/server/utils/resolveProject'
import { getTextProviderForStage } from '~~/server/utils/ai'
import { buildProductMetadataPrompt } from '~~/server/services/prompts'
import { createFulfillmentProvider } from '~~/server/services/fulfilment'
import { generateSKU } from '~~/server/services/sku/generator'
import { createBgRemovalProvider } from '~~/server/services/background-removal'
import { uploadImage, isS3Configured } from '~~/server/services/storage/s3'
import { resolveProvidersForCapability } from '~~/server/utils/provider-registry'
import { z } from 'zod'

const bodySchema = z.object({
  placements: z.array(z.object({
    imageId: z.string().min(1),
    blueprintId: z.string().min(1),
    printProviderId: z.string().optional(),
    variantIds: z.array(z.string()).optional(),
    defaultVariantId: z.string().optional(),
    removeBackground: z.boolean().optional().default(false),
    backgroundProvider: z.string().optional(),
    category: z.string().optional(),  // 'tshirt' | 'hoodie' | 'tanktop' | 'cap' | 'tote' | 'cup'
  })).min(1),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const projectId = getRouterParam(event, 'projectId')!
  const body = await readValidatedBody(event, bodySchema.parse)
  const db = useDB()
  const config = useRuntimeConfig()

  const project = await resolveWritableProjectById(user, projectId)

  const settings = await db.query.userSettings.findFirst({
    where: eq(schema.userSettings.userId, user.id),
  })
  // Resolve fulfillment provider
  const fulfillmentProviders = await resolveProvidersForCapability('fulfillment', {
    settings: settings as any,
    config: config as any,
    preferredProviderId: project.fulfillmentProvider,
    defaultSettingsKey: 'defaultFulfillmentProvider',
    defaultConfigKey: 'defaultFulfillmentProvider',
  })

  if (fulfillmentProviders.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No fulfillment provider is configured with an API key. Enable one in Settings or set an environment variable.',
    })
  }

  const { id: fulfillmentProviderId, apiKey: fulfillmentApiKey } = fulfillmentProviders[0]!

  const fulfillment = createFulfillmentProvider(fulfillmentProviderId as any, fulfillmentApiKey, {
    shopId: settings?.printifyShopId ?? undefined,
  })

  // Resolve background removal providers (ordered by preference)
  const bgProviders = await resolveProvidersForCapability('background-removal', {
    settings: settings as any,
    config: config as any,
    defaultSettingsKey: 'defaultBackgroundRemovalProvider',
    defaultConfigKey: 'defaultBackgroundRemovalProvider',
  })

  const ai = await getTextProviderForStage(event, user.id, 'product-metadata', { projectId: project.id })

  // Get existing product count for SKU sequencing
  const existingProducts = await db.query.products.findMany({
    where: eq(schema.products.projectId, project.id),
  })
  let sequence = existingProducts.length + 1

  const createdProducts: Array<typeof schema.products.$inferInsert> = []

  for (const placement of body.placements) {
    const { imageId, blueprintId, printProviderId } = placement
    // Get image with its prompt and theme info
    const image = await db
      .select({
        image: schema.generatedImages,
        prompt: schema.imagePrompts,
        theme: schema.themes,
      })
      .from(schema.generatedImages)
      .innerJoin(schema.imagePrompts, eq(schema.generatedImages.promptId, schema.imagePrompts.id))
      .innerJoin(schema.themes, eq(schema.imagePrompts.themeId, schema.themes.id))
      .where(eq(schema.generatedImages.id, imageId))
      .get()

    if (!image) continue

    // Generate product metadata via AI
    const metadataPrompt = buildProductMetadataPrompt({
      theme: {
        title: image.theme.title,
        description: image.theme.description ?? '',
        targetDemographic: image.theme.targetDemographic,
      },
      imageDescription: image.prompt.promptText,
    })

    let metadata: { title: string; description: string; tags: string[] }
    let metadataFallback = false
    try {
      metadata = await ai.generateJSON<{
        title: string
        description: string
        tags: string[]
      }>({
        prompt: metadataPrompt.user,
        systemPrompt: metadataPrompt.system,
        temperature: 0.7,
      })
    } catch {
      // AI metadata failed — fall back silently. The product row gets a
      // `metadataFallback: true` flag, surfaced in Stage 7 via the "Placeholder
      // metadata" badge, which is the user-facing signal.
      metadataFallback = true
      const descSource = (image.prompt.promptText ?? image.theme.description ?? '').trim()
      metadata = {
        title: image.theme.title,
        description: descSource.length > 280 ? descSource.slice(0, 277) + '…' : descSource,
        tags: [],
      }
    }

    // Priority: user-selected variation > upscaled > bg-removed > original.
    let selectedVariationUrl: string | null = null
    if (image.image.selectedVariationId) {
      const sv = await db.query.imageVariations.findFirst({
        where: eq(schema.imageVariations.id, image.image.selectedVariationId),
      })
      if (sv) {
        if (sv.s3Key && isS3Configured()) {
          const { getImageUrl } = await import('~~/server/services/storage/s3')
          try { selectedVariationUrl = await getImageUrl(sv.s3Key, 3600) } catch { selectedVariationUrl = sv.url }
        } else {
          selectedVariationUrl = sv.url
        }
      }
    }
    let uploadedImageUrl = selectedVariationUrl ?? image.image.upscaledUrl ?? image.image.bgRemovedUrl ?? image.image.imageUrl
    let bgRemovalFailed = false
    let bgRemovalProviderUsed: string | null = null

    if (placement.removeBackground) {
      // If user explicitly chose a provider, only try that one; otherwise use full fallback chain
      const candidates = placement.backgroundProvider
        ? bgProviders.filter((p) => p.id === placement.backgroundProvider)
        : bgProviders

      if (candidates.length === 0) {
        console.error(`Failed to remove background for image ${imageId}. No configured background removal provider available.`)
        bgRemovalFailed = true
      } else {
        const bgErrors: string[] = []

        let bgSourceUrl = image.image.imageUrl
        if (image.image.s3KeyGenerated && isS3Configured()) {
          const { getImageUrl } = await import('~~/server/services/storage/s3')
          try {
            bgSourceUrl = await getImageUrl(image.image.s3KeyGenerated, 3600)
          } catch {
            // Fall back to stored URL
          }
        }

        for (const { id: providerName, apiKey: providerKey } of candidates) {
          const provider = createBgRemovalProvider(providerName as any, providerKey || undefined)

          try {
            const result = await provider.removeBackground(bgSourceUrl)

            let imageBuffer: Buffer | null = null
            if (result.imageUrl.startsWith('data:')) {
              const b64Data = result.imageUrl.split(',')[1]
              if (b64Data) {
                imageBuffer = Buffer.from(b64Data, 'base64')
              }
              uploadedImageUrl = result.imageUrl
            } else {
              uploadedImageUrl = result.imageUrl
              const res = await fetch(uploadedImageUrl)
              imageBuffer = Buffer.from(await res.arrayBuffer())
            }

            bgRemovalProviderUsed = providerName

            // Persist bg-removed image to S3
            if (isS3Configured() && imageBuffer) {
              try {
                const s3Key = await uploadImage(projectId, 'bg-removed', imageId, imageBuffer)
                await db.update(schema.generatedImages)
                  .set({ s3KeyBgRemoved: s3Key })
                  .where(eq(schema.generatedImages.id, imageId))
              } catch (s3Err) {
                console.error(`S3 upload failed for bg-removed image ${imageId}:`, s3Err)
              }
            }

            break
          } catch (error: any) {
            bgErrors.push(`${providerName}: ${error?.message ?? 'failed'}`)
            if (placement.backgroundProvider) break
          }
        }

        if (!bgRemovalProviderUsed) {
          console.error(`Failed to remove background for image ${imageId}.`, bgErrors.join(' | '))
          bgRemovalFailed = true
        }
      }
    }

    // Resolve selected variant IDs back to color names for filtering, and locate the default.
    let selectedColorNames: string[] | undefined
    let defaultColorName: string | undefined
    if (placement.variantIds && placement.variantIds.length > 0) {
      try {
        const variants = await fulfillment.getBlueprintVariants(blueprintId)
        const variantIdSet = new Set(placement.variantIds)
        const selected = variants.filter(v => variantIdSet.has(v.id))
        selectedColorNames = selected.map(v => v.colorName)
        if (placement.defaultVariantId) {
          defaultColorName = selected.find(v => v.id === placement.defaultVariantId)?.colorName
        }
      } catch {
        // If variant lookup fails, proceed without color filter
      }
    }

    // Honor the explicit selection — never silently drop a color the user picked.
    const userMaxVariants = settings?.maxProductVariants ?? 5
    const maxVariants = Math.max(userMaxVariants, selectedColorNames?.length ?? 0)

    // Generate base SKU upfront so per-variant SKUs can be derived and passed to Printify.
    const sku = generateSKU({
      niche: project.niche ?? 'custom',
      themeId: image.theme.id,
      productType: placement.category ?? 'tshirt',
      sequence: sequence++,
    })

    // Create product in fulfillment provider
    try {
      const result = await fulfillment.createProduct({
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags,
        imageUrl: uploadedImageUrl,
        blueprintId: blueprintId,
        printProviderId: printProviderId ?? '',
        selectedColorNames,
        defaultColorName,
        maxVariants,
        sku,
      })

      const productMeta: Record<string, any> = {}
      if (bgRemovalFailed) productMeta.bgRemovalFailed = true
      if (bgRemovalProviderUsed) productMeta.bgRemovalProvider = bgRemovalProviderUsed
      if (metadataFallback) productMeta.metadataFallback = true

      createdProducts.push({
        id: crypto.randomUUID(),
        projectId: project.id,
        imageId,
        sku,
        title: metadata.title,
        description: metadata.description,
        tags: JSON.stringify(metadata.tags),
        fulfillmentProvider: fulfillmentProviderId,
        externalProductId: result.externalProductId,
        blueprintId: blueprintId,
        printProviderId: printProviderId ?? null,
        status: 'created',
        metadata: Object.keys(productMeta).length > 0 ? JSON.stringify(productMeta) : null,
        mockupImages: result.mockupImages && result.mockupImages.length > 0
          ? JSON.stringify(result.mockupImages)
          : null,
      })
    } catch (error: any) {
      createdProducts.push({
        id: crypto.randomUUID(),
        projectId: project.id,
        imageId,
        sku,
        title: metadata.title,
        description: metadata.description,
        tags: JSON.stringify(metadata.tags),
        fulfillmentProvider: fulfillmentProviderId,
        status: 'failed',
        errorMessage: error.message ?? 'Product creation failed',
      })
    }
  }

  if (createdProducts.length > 0) {
    await db.insert(schema.products).values(createdProducts)
  }

  return { products: createdProducts, count: createdProducts.length }
})
