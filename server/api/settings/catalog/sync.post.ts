import { useDB, schema } from '~~/server/database'
import { eq } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'
import { PrintifyProvider } from '~~/server/services/fulfilment/providers/printify'
import { z } from 'zod'

const bodySchema = z.object({
  provider: z.enum(['printify']),
})

const CHUNK = 100

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readValidatedBody(event, bodySchema.parse)
  const db = useDB()
  const config = useRuntimeConfig()

  if (body.provider === 'printify') {
    const settings = await db.query.userSettings.findFirst({
      where: eq(schema.userSettings.userId, user.id),
    })

    const apiKey = (settings?.printifyApiKey ?? config.printifyApiKey) as string | undefined
    if (!apiKey) {
      throw createError({ statusCode: 400, statusMessage: 'No Printify API key configured.' })
    }

    const printify = new PrintifyProvider(apiKey)
    const blueprints = await printify.syncAllBlueprints()

    // Delete all existing rows for this provider then bulk-insert in chunks.
    // This is far faster than per-row upserts for 1000+ blueprints.
    await db.delete(schema.providerBlueprints).where(eq(schema.providerBlueprints.provider, 'printify'))

    const rows = blueprints.map(bp => ({
      id: crypto.randomUUID(),
      provider: 'printify' as const,
      blueprintId: bp.id,
      title: bp.title,
      brandName: bp.brandName ?? null,
      description: bp.description ?? null,
      imageUrl: bp.imageUrl ?? null,
      basePrice: bp.basePrice ?? null,
      syncedAt: new Date(),
    }))

    for (let i = 0; i < rows.length; i += CHUNK) {
      await db.insert(schema.providerBlueprints).values(rows.slice(i, i + CHUNK))
    }

    return { synced: rows.length, provider: 'printify' }
  }

  throw createError({ statusCode: 400, statusMessage: 'Unsupported provider' })
})
