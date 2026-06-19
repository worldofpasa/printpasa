import { useDB, schema } from '~~/server/database'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)

    // Verify signature if needed, or rely on obscure URL / IP filtering
    const type = body.type // e.g. "product:publish:succeeded"

    const db = useDB()

    if (type === 'product:publish:succeeded' || type === 'product:publish:failed') {
        const data = body.data
        const externalId = data.id

        // Find our product
        const product = await db.query.products.findFirst({
            where: eq(schema.products.externalProductId, String(externalId))
        })

        if (product) {
            await db.update(schema.products)
                .set({
                    status: type === 'product:publish:succeeded' ? 'published' : 'failed',
                    errorMessage: type === 'product:publish:failed' ? data.reason ?? 'Publish failed' : null
                })
                .where(eq(schema.products.id, product.id))
        }
    }

    return { received: true }
})
