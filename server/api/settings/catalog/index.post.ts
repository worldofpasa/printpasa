import { useDB, schema } from '~~/server/database'
import { eq, and, max } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'
import { PrintifyProvider } from '~~/server/services/fulfilment/providers/printify'
import { z } from 'zod'

const bodySchema = z.object({
  // Accept either a DB row id (legacy) or a raw Printify blueprintId string
  providerBlueprintId: z.string().min(1).optional(),
  blueprintId: z.string().min(1).optional(),
  provider: z.enum(['printify']).optional().default('printify'),
  title: z.string().optional(),
  imageUrl: z.string().optional(),
  category: z.enum(['tshirt', 'hoodie', 'tanktop', 'cap', 'tote', 'cup']),
  displayName: z.string().min(1).optional(),
}).refine(d => d.providerBlueprintId || d.blueprintId, {
  message: 'Either providerBlueprintId or blueprintId is required',
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readValidatedBody(event, bodySchema.parse)
  const db = useDB()
  const config = useRuntimeConfig()

  const provider = body.provider ?? 'printify'
  // The raw Printify blueprint ID (numeric string like "12")
  const rawBlueprintId = body.blueprintId ?? null

  // Resolve or create the providerBlueprints row
  let pbRow = rawBlueprintId
    ? await db.query.providerBlueprints.findFirst({
        where: and(
          eq(schema.providerBlueprints.provider, provider),
          eq(schema.providerBlueprints.blueprintId, rawBlueprintId),
        ),
      })
    : await db.query.providerBlueprints.findFirst({
        where: eq(schema.providerBlueprints.id, body.providerBlueprintId!),
      })

  if (!pbRow) {
    // Blueprint not in DB yet — fetch detail from Printify and persist it now
    const settings = await db.query.userSettings.findFirst({
      where: eq(schema.userSettings.userId, user.id),
    })
    const apiKey = (settings?.printifyApiKey ?? config.printifyApiKey) as string | undefined
    if (!apiKey) {
      throw createError({ statusCode: 400, statusMessage: 'No Printify API key configured.' })
    }
    const printify = new PrintifyProvider(apiKey)
    const detail = await printify.enrichBlueprintDetail(rawBlueprintId!)
    const newId = crypto.randomUUID()
    await db.insert(schema.providerBlueprints).values({
      id: newId,
      provider,
      blueprintId: rawBlueprintId!,
      title: detail.title ?? body.title ?? rawBlueprintId!,  // always trust Printify over client
      brandName: detail.brandName,
      description: null,
      imageUrl: detail.imageUrl ?? body.imageUrl ?? null,
      previewImageUrl: detail.previewImageUrl ?? null,
      allImages: detail.allImages.length > 0 ? JSON.stringify(detail.allImages) : null,
      basePrice: detail.basePrice,
      syncedAt: new Date(),
    })
    pbRow = await db.query.providerBlueprints.findFirst({ where: eq(schema.providerBlueprints.id, newId) })
  } else {
    // Row exists — always re-enrich on add so stale/wrong data gets corrected
    const settings = await db.query.userSettings.findFirst({
      where: eq(schema.userSettings.userId, user.id),
    })
    const apiKey = (settings?.printifyApiKey ?? config.printifyApiKey) as string | undefined
    if (apiKey) {
      const printify = new PrintifyProvider(apiKey)
      const detail = await printify.enrichBlueprintDetail(pbRow.blueprintId)
      await db.update(schema.providerBlueprints)
        .set({
          title: detail.title ?? pbRow.title,
          brandName: detail.brandName ?? pbRow.brandName,
          imageUrl: detail.imageUrl ?? pbRow.imageUrl,
          // Preserve user-chosen preview image; only fill in if not yet set.
          previewImageUrl: pbRow.previewImageUrl ?? detail.previewImageUrl ?? null,
          allImages: detail.allImages.length > 0 ? JSON.stringify(detail.allImages) : pbRow.allImages,
        })
        .where(eq(schema.providerBlueprints.id, pbRow.id))
      pbRow = { ...pbRow, title: detail.title ?? pbRow.title, brandName: detail.brandName, imageUrl: detail.imageUrl, previewImageUrl: pbRow.previewImageUrl ?? detail.previewImageUrl, allImages: detail.allImages.length > 0 ? JSON.stringify(detail.allImages) : pbRow.allImages }
    }
  }

  if (!pbRow) throw createError({ statusCode: 500, statusMessage: 'Failed to resolve blueprint' })

  // Prevent duplicates per user
  const existing = await db.query.catalogItems.findFirst({
    where: and(
      eq(schema.catalogItems.userId, user.id),
      eq(schema.catalogItems.providerBlueprintId, pbRow.id),
    ),
  })
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'This blueprint is already in your catalog.' })
  }

  // Determine sort order: append at end of its category
  const orderRows = await db
    .select({ maxOrder: max(schema.catalogItems.sortOrder) })
    .from(schema.catalogItems)
    .where(and(
      eq(schema.catalogItems.userId, user.id),
      eq(schema.catalogItems.category, body.category),
    ))

  const sortOrder = ((orderRows[0]?.maxOrder) ?? -1) + 1
  const displayName = body.displayName ?? (pbRow.brandName ?? pbRow.title)

  const id = crypto.randomUUID()
  await db.insert(schema.catalogItems).values({
    id,
    userId: user.id,
    provider: pbRow.provider,
    providerBlueprintId: pbRow.id,
    category: body.category,
    displayName,
    enabled: true,
    sortOrder,
  })

  return { id, category: body.category, displayName }
})
