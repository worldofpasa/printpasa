import { useDB, schema } from '~~/server/database'
import { eq, and } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'
import { resolveWritableProjectById } from '~~/server/utils/resolveProject'
import { z } from 'zod'

const bodySchema = z.object({
    imageId: z.string(),
    isSelected: z.boolean(),
})

export default defineEventHandler(async (event) => {
    const user = await requireUser(event)
    const projectId = getRouterParam(event, 'projectId')!
    const body = await readValidatedBody(event, bodySchema.parse)
    const db = useDB()

    const project = await resolveWritableProjectById(user, projectId)

    // Update image selection
    await db
        .update(schema.generatedImages)
        .set({ isSelected: body.isSelected })
        .where(eq(schema.generatedImages.id, body.imageId))

    return { ok: true }
})
