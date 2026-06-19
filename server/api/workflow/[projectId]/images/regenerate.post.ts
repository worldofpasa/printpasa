import { useDB, schema } from '~~/server/database'
import { eq, and } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'
import { resolveWritableProjectById } from '~~/server/utils/resolveProject'
import { getImageProviderForUser } from '~~/server/utils/ai'
import { resolveGenerationModel } from '~~/server/services/image-generation/lanes'
import { uploadImage, buildImageFilename, isS3Configured } from '~~/server/services/storage/s3'
import { slugify } from '~~/server/utils/slugify'
import { z } from 'zod'

const bodySchema = z.object({
    promptId: z.string(),
    promptText: z.string().min(1),
    provider: z.string().optional(),
    model: z.string().optional(),
})

export default defineEventHandler(async (event) => {
    const user = await requireUser(event)
    const projectId = getRouterParam(event, 'projectId')!
    const body = await readValidatedBody(event, bodySchema.parse)
    const db = useDB()

    const project = await resolveWritableProjectById(user, projectId)

    // Get the original prompt to find its theme
    const originalPrompt = await db.query.imagePrompts.findFirst({
        where: eq(schema.imagePrompts.id, body.promptId),
    })
    if (!originalPrompt) {
        throw createError({ statusCode: 404, statusMessage: 'Prompt not found' })
    }

    // Get theme for slug
    const theme = await db.query.themes.findFirst({
        where: eq(schema.themes.id, originalPrompt.themeId),
    })
    if (!theme) {
        throw createError({ statusCode: 404, statusMessage: 'Theme not found' })
    }

    // Create a new prompt record (don't update the original)
    const newPromptId = crypto.randomUUID()
    await db.insert(schema.imagePrompts).values({
        id: newPromptId,
        themeId: originalPrompt.themeId,
        promptText: body.promptText,
        originalPromptText: originalPrompt.originalPromptText,
        style: originalPrompt.style,
        designLane: originalPrompt.designLane,
        sloganText: originalPrompt.sloganText,
        recommendedModel: originalPrompt.recommendedModel,
        backgroundColorHex: originalPrompt.backgroundColorHex,
        backgroundColorName: originalPrompt.backgroundColorName,
        sortOrder: originalPrompt.sortOrder,
        isSelected: true,
        status: 'active',
        generationBatch: originalPrompt.generationBatch,
    })

    // Generate image for the new prompt
    const model = resolveGenerationModel(originalPrompt, { overrideModel: body.model })
    const imageProvider = await getImageProviderForUser(event, user.id, body.provider, model)
    const imageId = crypto.randomUUID()
    const themeSlug = theme.slug || slugify(theme.title)
    const filename = buildImageFilename(themeSlug)

    try {
        const result = await imageProvider.generate({
            prompt: body.promptText,
            width: 1024,
            height: 1024,
            dpi: 300,
            negativePrompt: 't-shirt, mockup, model, person wearing, clothing, garment, fabric, blurry, low quality',
        })

        // Upload to S3 if configured. Generation still succeeds on S3 error —
        // the row goes in — but we record the reason so backfill can see it.
        let s3Key: string | null = null
        let s3UploadError: string | null = null
        if (result.status === 'completed' && result.imageUrl && isS3Configured()) {
            try {
                const imgRes = await fetch(result.imageUrl)
                if (!imgRes.ok) throw new Error(`upstream ${imgRes.status}`)
                const buf = Buffer.from(await imgRes.arrayBuffer())
                s3Key = await uploadImage(project.slug || projectId, 'generated', filename, buf)
            } catch (e: any) {
                s3UploadError = String(e?.message ?? e)
                console.error(`[regenerate] S3 upload failed for image ${imageId}:`, s3UploadError)
            }
        } else if (result.status === 'completed' && result.imageUrl && !isS3Configured()) {
            s3UploadError = 's3-not-configured'
        }

        const mergedMetadata = s3UploadError
            ? { ...(result.metadata ?? {}), s3UploadError }
            : result.metadata

        const imageRecord = {
            id: imageId,
            promptId: newPromptId,
            imageUrl: result.imageUrl,
            thumbnailUrl: result.thumbnailUrl ?? null,
            imageProvider: imageProvider.name,
            width: result.width,
            height: result.height,
            dpi: 300,
            generationStatus: result.status === 'completed' ? 'completed' : 'pending',
            providerJobId: result.jobId ?? null,
            isSelected: false,
            status: 'active' as const,
            generationBatch: crypto.randomUUID(),
            s3KeyGenerated: s3Key,
            metadata: mergedMetadata ? JSON.stringify(mergedMetadata) : null,
        }

        await db.insert(schema.generatedImages).values(imageRecord)

        return {
            image: {
                ...imageRecord,
                promptText: body.promptText,
                themeTitle: theme.title,
                themeId: theme.id,
            },
        }
    } catch (error: any) {
        // If generation fails, still save the failed record
        const failedRecord = {
            id: imageId,
            promptId: newPromptId,
            imageUrl: '',
            imageProvider: imageProvider.name,
            width: 1024,
            height: 1024,
            generationStatus: 'failed' as const,
            errorMessage: error.message ?? 'Image generation failed',
            isSelected: false,
            status: 'active' as const,
            generationBatch: crypto.randomUUID(),
        }

        await db.insert(schema.generatedImages).values(failedRecord)

        return {
            image: {
                ...failedRecord,
                promptText: body.promptText,
                themeTitle: theme.title,
                themeId: theme.id,
            },
        }
    }
})
