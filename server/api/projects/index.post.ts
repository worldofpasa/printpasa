import { useDB, schema } from '~~/server/database'
import { requireUser } from '~~/server/utils/auth'
import { generateUniqueSlug } from '~~/server/utils/slugify'
import { resolvePipelineOwnerUserId } from '~~/server/utils/superuser-seed'
import { z } from 'zod'

const bodySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
})

async function resolveProjectOwnerId(user: { id: string }) {
  const config = useRuntimeConfig()
  const ownerRef = (config.pipelineOwnerUserId as string)?.trim()
  if (user.id === 'service-agent' && ownerRef) {
    const ownerId = await resolvePipelineOwnerUserId(ownerRef)
    if (!ownerId) {
      throw createError({
        statusCode: 500,
        statusMessage: `Pipeline owner user not found: ${ownerRef}. Run db:seed or start the server to seed admin.`,
      })
    }
    return ownerId
  }
  return user.id
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readValidatedBody(event, bodySchema.parse)
  const db = useDB()

  const ownerId = await resolveProjectOwnerId(user)
  const id = crypto.randomUUID()
  const slug = await generateUniqueSlug(ownerId, body.name)
  const originActor = user.id === 'service-agent' ? null : (user.name || user.email)

  const [project] = await db
    .insert(schema.projects)
    .values({
      id,
      userId: ownerId,
      name: body.name,
      slug,
      description: body.description ?? null,
      originSource: 'portal',
      originActor,
      originMeta: user.id === 'service-agent' ? null : JSON.stringify({ userId: user.id }),
    })
    .returning()

  return project
})
