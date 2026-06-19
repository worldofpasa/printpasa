import { useDB, schema } from '~~/server/database'
import { eq } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'
import { resolveWritableProjectById } from '~~/server/utils/resolveProject'
import { createBgRemovalProvider } from '~~/server/services/background-removal'
import { refineBorders } from '~~/server/services/background-removal/refine'
import { uploadImage, buildImageFilename, isS3Configured, getImageUrl } from '~~/server/services/storage/s3'
import { resolveProvidersForCapability } from '~~/server/utils/provider-registry'
import { z } from 'zod'

const bodySchema = z.object({
    provider: z.string().optional(),
    model: z.string().optional(),
    refineTolerance: z.number().int().min(0).max(120).optional(),
})

export default defineEventHandler(async (event) => {
    const user = await requireUser(event)
    const projectId = getRouterParam(event, 'projectId')!
    const imageId = getRouterParam(event, 'imageId')!
    const body = await readValidatedBody(event, bodySchema.parse)
    const db = useDB()

    const project = await resolveWritableProjectById(user, projectId)

    const image = await db.query.generatedImages.findFirst({
        where: eq(schema.generatedImages.id, imageId),
    })

    if (!image) {
        throw createError({ statusCode: 404, statusMessage: 'Image not found' })
    }

    const settings = await db.query.userSettings.findFirst({
        where: eq(schema.userSettings.userId, user.id),
    })
    const config = useRuntimeConfig()

    const providers = await resolveProvidersForCapability('background-removal', {
        settings: settings as any,
        config: config as any,
        preferredProviderId: body.provider,
        defaultSettingsKey: 'defaultBackgroundRemovalProvider',
        defaultConfigKey: 'defaultBackgroundRemovalProvider',
    })

    if (providers.length === 0) {
        throw createError({
            statusCode: 400,
            statusMessage: 'No background removal provider is configured with an API key. Enable one in Settings or set an environment variable.',
        })
    }

    // If user explicitly chose a provider, only try that one
    const candidates = body.provider
        ? providers.filter((p) => p.id === body.provider)
        : providers

    if (candidates.length === 0) {
        throw createError({ statusCode: 400, statusMessage: `Background removal provider "${body.provider}" is not available. Check that it is enabled and has an API key.` })
    }

    // Set processing status
    await db.update(schema.generatedImages)
        .set({ bgRemovalStatus: 'processing', bgRemovalError: null })
        .where(eq(schema.generatedImages.id, imageId))

    let sourceUrl = image.imageUrl
    if (image.s3KeyGenerated && isS3Configured()) {
        try {
            sourceUrl = await getImageUrl(image.s3KeyGenerated, 3600)
        } catch {
            // Fall back to stored URL for legacy rows without a valid key
        }
    }

    const errors: string[] = []

    for (const { id: providerName, apiKey } of candidates) {
        try {
            const provider = createBgRemovalProvider(providerName as any, apiKey)

            const result = await provider.removeBackground(sourceUrl)

            let finalUrl = result.imageUrl
            let s3Key: string | null = null

            if (result.status === 'completed' && result.imageUrl) {
                try {
                    let buf: Buffer | null = null
                    if (result.imageUrl.startsWith('data:')) {
                        const b64Data = result.imageUrl.split(',')[1]
                        if (b64Data) {
                            buf = Buffer.from(b64Data, 'base64')
                        }
                    } else {
                        const imgRes = await fetch(result.imageUrl)
                        if (imgRes.ok) {
                            buf = Buffer.from(await imgRes.arrayBuffer())
                        }
                    }

                    // Post-process: flood-fill transparent from any still-opaque corner.
                    // Catches segmentation misses on AI-illustrated canvases where the
                    // cream/white background is treated as part of the subject.
                    if (buf) {
                        try {
                            const refined = await refineBorders(buf, body.refineTolerance)
                            if (refined !== buf) {
                                buf = refined
                                finalUrl = `data:image/png;base64,${refined.toString('base64')}`
                            }
                        } catch (e) {
                            console.warn(`Border refinement skipped for image ${imageId}:`, e)
                        }
                    }

                    if (buf && isS3Configured()) {
                        // Derive filename from original S3 key if possible
                        let baseFilename = imageId
                        if (image.s3KeyGenerated) {
                            const last = image.s3KeyGenerated.split('/').pop() ?? ''
                            baseFilename = last.replace(/\.[^.]+$/, '')
                        } else {
                            const prompt = await db.query.imagePrompts.findFirst({
                                where: eq(schema.imagePrompts.id, image.promptId)
                            })
                            let themeSlug = 'unknown'
                            if (prompt) {
                                const theme = await db.query.themes.findFirst({
                                    where: eq(schema.themes.id, prompt.themeId)
                                })
                                if (theme && theme.slug) themeSlug = theme.slug
                            }
                            baseFilename = buildImageFilename(themeSlug, 0)
                        }

                        const filename = `${baseFilename}_nobg`
                        s3Key = await uploadImage(project.slug || projectId, 'bg-removed', filename, buf)
                        if (s3Key) {
                            finalUrl = await getImageUrl(s3Key, 86400)
                        }
                    }
                } catch (e) {
                    console.error(`S3 upload failed for bg removal image ${imageId}:`, e)
                }
            }

            await db.update(schema.generatedImages)
                .set({
                    bgRemovedUrl: finalUrl,
                    s3KeyBgRemoved: s3Key,
                    bgRemovalStatus: result.status === 'completed' ? 'completed' : 'pending',
                    bgRemovalError: null,
                })
                .where(eq(schema.generatedImages.id, imageId))

            return { image: { ...image, bgRemovedUrl: finalUrl, bgRemovalStatus: 'completed', bgRemovalError: null } }
        } catch (error: any) {
            const message = error?.message ?? 'Background removal failed'
            errors.push(`${providerName}: ${message}`)

            await db.update(schema.generatedImages)
                .set({ bgRemovalStatus: 'failed', bgRemovalError: message })
                .where(eq(schema.generatedImages.id, imageId))
        }
    }

    throw createError({
        statusCode: 500,
        statusMessage: `Background removal failed. ${errors.join(' | ')}`,
    })
})
