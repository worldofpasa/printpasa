import { useDB, schema } from '~~/server/database'
import { eq } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'
import { createFulfillmentProvider } from '~~/server/services/fulfilment'

export default defineEventHandler(async (event) => {
    const user = await requireUser(event)
    const db = useDB()
    const config = useRuntimeConfig()

    const settings = await db.query.userSettings.findFirst({
        where: eq(schema.userSettings.userId, user.id),
    })

    const fulfillmentProviderName = (settings?.defaultFulfillmentProvider ?? config.defaultFulfillmentProvider ?? 'printify') as any

    if (fulfillmentProviderName !== 'printify') {
        return { blueprints: [] }
    }

    const apiKey = (settings?.printifyApiKey ?? config.printifyApiKey) as string
    if (!apiKey) {
        throw createError({ statusCode: 400, statusMessage: 'No Printify API key configured. Please configure it in Settings or .env.' })
    }

    const fulfillment = createFulfillmentProvider(fulfillmentProviderName, apiKey, {
        shopId: settings?.printifyShopId ?? undefined,
    })

    try {
        const blueprints = await fulfillment.getBlueprints()
        return { blueprints }
    } catch (err: any) {
        throw createError({ statusCode: 500, statusMessage: err.message ?? 'Failed to load blueprints' })
    }
})
