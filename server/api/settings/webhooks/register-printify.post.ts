import { useDB, schema } from '~~/server/database'
import { eq } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireUser(event)
    const body = await readBody<{ url: string }>(event)
    const db = useDB()
    const config = useRuntimeConfig()

    const settings = await db.query.userSettings.findFirst({
        where: eq(schema.userSettings.userId, user.id),
    })

    // get Printify API Key & Shop ID
    const apiKey = (settings?.printifyApiKey ?? config.printifyApiKey) as string
    let shopId = settings?.printifyShopId

    if (!apiKey) {
        throw createError({ statusCode: 400, statusMessage: 'Printify API key not found' })
    }

    // if no shop id, try to fetch the first one
    if (!shopId) {
        const shops = await $fetch<Array<{ id: number }>>('https://api.printify.com/v1/shops.json', {
            headers: { Authorization: `Bearer ${apiKey}` }
        })
        if (!shops.length) throw createError({ statusCode: 400, statusMessage: 'No Printify shop found' })
        shopId = String(shops[0]!.id)
    }

    // Delete existing webhooks if we want to just replace
    // But for simple setup, let's just register
    const targetUrl = body.url || `${getRequestProtocol(event)}://${getRequestHost(event)}/api/webhooks/printify`

    try {
        const result = await $fetch<{ id: string }>(`https://api.printify.com/v1/shops/${shopId}/webhooks.json`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: {
                url: targetUrl,
                topic: 'product:publish:succeeded'
            }
        })

        await $fetch<{ id: string }>(`https://api.printify.com/v1/shops/${shopId}/webhooks.json`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: {
                url: targetUrl,
                topic: 'product:publish:failed'
            }
        })

        return { ok: true, message: 'Webhooks registered successfully!' }
    } catch (err: any) {
        throw createError({ statusCode: 500, statusMessage: err.data?.message ?? err.message })
    }
})
