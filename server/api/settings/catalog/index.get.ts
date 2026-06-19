import { useDB, schema } from '~~/server/database'
import { eq, asc } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'
import { PrintifyProvider } from '~~/server/services/fulfilment/providers/printify'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = useDB()
  const config = useRuntimeConfig()

  const rows = await db
    .select({
      item: schema.catalogItems,
      blueprint: schema.providerBlueprints,
    })
    .from(schema.catalogItems)
    .innerJoin(schema.providerBlueprints, eq(schema.catalogItems.providerBlueprintId, schema.providerBlueprints.id))
    .where(eq(schema.catalogItems.userId, user.id))
    .orderBy(asc(schema.catalogItems.sortOrder), asc(schema.catalogItems.createdAt))

  // Fire-and-forget: enrich any catalog items missing brandName or imageUrl.
  // Covers items added before enrichment was implemented. Doesn't block the response
  // but patches in-flight rows so the current response already reflects the fix.
  // Backfill:
  // 1. Rows missing brandName (never enriched)
  // 2. Rows where displayName doesn't match brandName — indicates stale/wrong data
  //    e.g. displayName="Gildan 5000" but blueprint.title="Bella+Canvas 3719..."
  const unenriched = rows.filter(r =>
    r.blueprint.provider === 'printify' && (
      r.blueprint.brandName === null ||
      r.blueprint.previewImageUrl === null ||
      (r.blueprint.brandName && r.item.displayName !== r.blueprint.brandName &&
        !r.blueprint.title.toLowerCase().includes(r.item.displayName.toLowerCase()))
    ),
  )
  if (unenriched.length > 0) {
    const settings = await db.query.userSettings.findFirst({ where: eq(schema.userSettings.userId, user.id) })
    const apiKey = (settings?.printifyApiKey ?? config.printifyApiKey) as string | undefined
    if (apiKey) {
      const printify = new PrintifyProvider(apiKey)
      void Promise.allSettled(
        unenriched.map(async (r) => {
          const detail = await printify.enrichBlueprintDetail(r.blueprint.blueprintId)
          const updates: Record<string, any> = {}
          if (detail.title) updates.title = detail.title
          if (detail.brandName) updates.brandName = detail.brandName
          if (detail.imageUrl) updates.imageUrl = detail.imageUrl
          // Only write previewImageUrl if the user hasn't already chosen one —
          // never overwrite a manually selected preview with the auto-picked default.
          if (detail.previewImageUrl && !r.blueprint.previewImageUrl) updates.previewImageUrl = detail.previewImageUrl
          if (detail.allImages.length > 0) updates.allImages = JSON.stringify(detail.allImages)
          if (Object.keys(updates).length > 0) {
            await db.update(schema.providerBlueprints)
              .set(updates)
              .where(eq(schema.providerBlueprints.id, r.blueprint.id))
            if (detail.title) r.blueprint.title = detail.title
            if (detail.brandName) r.blueprint.brandName = detail.brandName
            if (detail.imageUrl) r.blueprint.imageUrl = detail.imageUrl
            if (detail.previewImageUrl && !r.blueprint.previewImageUrl) r.blueprint.previewImageUrl = detail.previewImageUrl
            if (detail.allImages.length > 0) r.blueprint.allImages = JSON.stringify(detail.allImages)
          }
        }),
      )
    }
  }

  return {
    items: rows.map(r => ({
      id: r.item.id,
      provider: r.item.provider,
      category: r.item.category,
      displayName: r.item.displayName,
      enabled: r.item.enabled,
      sortOrder: r.item.sortOrder,
      blueprint: {
        id: r.blueprint.id,
        blueprintId: r.blueprint.blueprintId,
        title: r.blueprint.title,
        brandName: r.blueprint.brandName,
        imageUrl: r.blueprint.imageUrl,
        previewImageUrl: r.blueprint.previewImageUrl,
        allImages: r.blueprint.allImages ? JSON.parse(r.blueprint.allImages) as string[] : null,
        basePrice: r.blueprint.basePrice,
        isBestseller: r.blueprint.isBestseller,
      },
    })),
  }
})
