import { useDB, schema } from '~~/server/database'
import { eq, and, inArray } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'
import { getImageProviderForUser } from '~~/server/utils/ai'
import { resolveGenerationModel } from '~~/server/services/image-generation/lanes'
import { uploadImage, buildImageFilename, isS3Configured } from '~~/server/services/storage/s3'
import { z } from 'zod'

const bodySchema = z.object({
  promptIds: z.array(z.string()).optional().default([]),
  provider: z.string().optional(),
  model: z.string().optional(),
  promptOverrides: z.array(z.object({
    promptId: z.string(),
    provider: z.string().optional(),
    model: z.string().optional(),
  })).optional().default([]),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const projectId = getRouterParam(event, 'projectId')!
  const body = await readValidatedBody(event, bodySchema.parse)
  const db = useDB()

  const project = await resolveWritableProjectById(user, projectId)

  // Get winner themes for this project
  const winnerThemes = await db.query.themes.findMany({
    where: and(eq(schema.themes.projectId, project.id), eq(schema.themes.isWinner, true)),
  })

  if (winnerThemes.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No winner themes found. Complete Stage 2 first.' })
  }

  const winnerThemeIds = winnerThemes.map(t => t.id)

  // Build a map from themeId → theme slug for S3 naming
  const themeSlugMap = new Map(winnerThemes.map(t => [t.id, t.slug || 'unknown']))

  // Find selected active prompts for winner themes only
  let promptIds = body.promptIds
  if (promptIds.length === 0) {
    const selectedPrompts = await db.query.imagePrompts.findMany({
      where: and(
        inArray(schema.imagePrompts.themeId, winnerThemeIds),
        eq(schema.imagePrompts.isSelected, true),
        eq(schema.imagePrompts.status, 'active'),
      ),
    })
    promptIds = selectedPrompts.map(p => p.id)
  }

  if (promptIds.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No selected prompts found for winner themes.' })
  }

  // Supersede existing images. When the caller passes explicit promptIds (per-prompt
  // generation), only supersede those. When promptIds is empty (batch), supersede all
  // active images for this project's winner-theme prompts.
  const supersedeIds = body.promptIds.length > 0
    ? promptIds
    : (await db.query.imagePrompts.findMany({
        where: and(
          inArray(schema.imagePrompts.themeId, winnerThemeIds),
          eq(schema.imagePrompts.status, 'active'),
        ),
      })).map(p => p.id)

  if (supersedeIds.length > 0) {
    await db.update(schema.generatedImages)
      .set({ status: 'superseded' })
      .where(and(
        inArray(schema.generatedImages.promptId, supersedeIds),
        eq(schema.generatedImages.status, 'active'),
      ))
  }

  // Per-prompt provider overrides; default to batch provider/model.
  const overrideMap = new Map(body.promptOverrides.map(o => [o.promptId, o]))
  const providerCache = new Map<string, Awaited<ReturnType<typeof getImageProviderForUser>>>()
  const resolveProvider = async (prompt: typeof schema.imagePrompts.$inferSelect) => {
    const ov = overrideMap.get(prompt.id)
    const p = ov?.provider ?? body.provider
    const m = resolveGenerationModel(prompt, { overrideModel: ov?.model, batchModel: body.model })
    const key = `${p ?? ''}|${m}`
    if (!providerCache.has(key)) {
      providerCache.set(key, await getImageProviderForUser(event, user.id, p, m))
    }
    return providerCache.get(key)!
  }

  // Get the actual prompt records (with themeId so we can map to theme slug)
  const prompts = await Promise.all(
    promptIds.map((id) =>
      db.query.imagePrompts.findFirst({ where: eq(schema.imagePrompts.id, id) }),
    ),
  )

  const validPrompts = prompts.filter(Boolean)

  const results: Array<typeof schema.generatedImages.$inferInsert> = []
  const batchId = crypto.randomUUID()

  // Ensure prompts are unique and valid
  const uniquePrompts = [...new Map(validPrompts.filter(p => !!p).map(p => [p!.id, p])).values()]

  // Track filenames used in this batch to avoid timestamp collisions
  const usedFilenames = new Set<string>()

  if (uniquePrompts.length > 0) {
    const generatePromises = uniquePrompts.map(async (prompt) => {
      const imageId = crypto.randomUUID()
      const themeSlug = themeSlugMap.get(prompt!.themeId) ?? 'unknown'
      const imageProvider = await resolveProvider(prompt!)

      // Generate a unique filename, handling timestamp collisions
      let filename = buildImageFilename(themeSlug)
      let counter = 1
      while (usedFilenames.has(filename)) {
        filename = buildImageFilename(themeSlug, counter++)
      }
      usedFilenames.add(filename)

      try {
        const result = await imageProvider.generate({
          prompt: prompt!.promptText,
          width: 1024,
          height: 1024,
          dpi: 300,
          negativePrompt: 't-shirt, mockup, model, person wearing, clothing, garment, fabric, blurry, low quality',
        })

        // Persist to S3 if configured. Generation itself should NOT abort on
        // S3 failure — we still want the row — but record the reason so the
        // backfill (and logs) can see why it went to provider CDN instead.
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
            console.error(`[generate] S3 upload failed for image ${imageId}:`, s3UploadError)
          }
        } else if (result.status === 'completed' && result.imageUrl && !isS3Configured()) {
          s3UploadError = 's3-not-configured'
        }

        const metadata = s3UploadError
          ? { ...(result.metadata ?? {}), s3UploadError }
          : result.metadata

        return {
          id: imageId,
          promptId: prompt!.id,
          imageUrl: result.imageUrl,
          thumbnailUrl: result.thumbnailUrl ?? null,
          imageProvider: imageProvider.name,
          width: result.width,
          height: result.height,
          dpi: 300,
          generationStatus: result.status === 'completed' ? 'completed' : 'pending',
          providerJobId: result.jobId ?? null,
          isSelected: false,
          status: 'active',
          generationBatch: batchId,
          s3KeyGenerated: s3Key,
          metadata: metadata ? JSON.stringify(metadata) : null,
        }
      } catch (error: any) {
        return {
          id: imageId,
          promptId: prompt!.id,
          imageUrl: '',
          imageProvider: imageProvider.name,
          width: 1024,
          height: 1024,
          generationStatus: 'failed',
          errorMessage: error.message ?? 'Image generation failed',
          isSelected: false,
          status: 'active',
          generationBatch: batchId,
        }
      }
    })

    const parallelResults = await Promise.all(generatePromises)
    results.push(...parallelResults)
  }

  if (results.length > 0) {
    await db.insert(schema.generatedImages).values(results)
  }

  return { images: results, count: results.length }
})
