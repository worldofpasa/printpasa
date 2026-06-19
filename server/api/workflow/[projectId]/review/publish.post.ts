import { useDB, schema } from '~~/server/database'
import { eq, and } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'
import { resolveWritableProjectById } from '~~/server/utils/resolveProject'
import { createFulfillmentProvider } from '~~/server/services/fulfilment'
import { z } from 'zod'

const bodySchema = z.object({
  productIds: z.array(z.string()).min(1),
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

  const apiKey = (settings?.printifyApiKey ?? config.printifyApiKey) as string
  if (!apiKey) {
    throw createError({ statusCode: 400, statusMessage: 'No Printify API key configured.' })
  }

  const fulfillment = createFulfillmentProvider('printify', apiKey, {
    shopId: settings?.printifyShopId ?? undefined,
  })

  const results: Array<{ productId: string; success: boolean; error?: string }> = []

  for (const productId of body.productIds) {
    const product = await db.query.products.findFirst({
      where: and(eq(schema.products.id, productId), eq(schema.products.projectId, project.id)),
    })

    if (!product || !product.externalProductId) {
      results.push({ productId, success: false, error: 'Product not found or not created in provider' })
      continue
    }

    try {
      const result = await fulfillment.publishProduct(product.externalProductId)

      await db.update(schema.products).set({
        status: result.success ? 'published' : 'failed',
        publishedAt: result.success ? new Date() : null,
        errorMessage: result.errorMessage ?? null,
        updatedAt: new Date(),
      }).where(eq(schema.products.id, productId))

      results.push({ productId, success: result.success, error: result.errorMessage })
    } catch (error: any) {
      await db.update(schema.products).set({
        status: 'failed',
        errorMessage: error.message,
        updatedAt: new Date(),
      }).where(eq(schema.products.id, productId))

      results.push({ productId, success: false, error: error.message })
    }
  }

  return { results }
})
