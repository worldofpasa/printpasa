import { useDB, schema } from '~~/server/database'
import { eq, and, inArray, desc } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'
import { resolveProjectById } from '~~/server/utils/resolveProject'
import { isS3Configured, getImageUrl } from '~~/server/services/storage/s3'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const projectId = getRouterParam(event, 'projectId')!
  const db = useDB()

  const project = await resolveProjectById(user, projectId)

  // Get active images for this project (superseded images are preserved but hidden)
  const images = await db
    .select({
      id: schema.generatedImages.id,
      imageUrl: schema.generatedImages.imageUrl,
      thumbnailUrl: schema.generatedImages.thumbnailUrl,
      imageProvider: schema.generatedImages.imageProvider,
      width: schema.generatedImages.width,
      height: schema.generatedImages.height,
      generationStatus: schema.generatedImages.generationStatus,
      providerJobId: schema.generatedImages.providerJobId,
      errorMessage: schema.generatedImages.errorMessage,
      isSelected: schema.generatedImages.isSelected,
      promptId: schema.generatedImages.promptId,
      promptText: schema.imagePrompts.promptText,
      promptBgHex: schema.imagePrompts.backgroundColorHex,
      promptBgName: schema.imagePrompts.backgroundColorName,
      themeId: schema.themes.id,
      themeTitle: schema.themes.title,
      createdAt: schema.generatedImages.createdAt,
      metadata: schema.generatedImages.metadata,
      bgRemovedUrl: schema.generatedImages.bgRemovedUrl,
      bgRemovalStatus: schema.generatedImages.bgRemovalStatus,
      bgRemovalError: schema.generatedImages.bgRemovalError,
      upscaledUrl: schema.generatedImages.upscaledUrl,
      upscaleStatus: schema.generatedImages.upscaleStatus,
      upscaleError: schema.generatedImages.upscaleError,
      s3KeyGenerated: schema.generatedImages.s3KeyGenerated,
      s3KeyBgRemoved: schema.generatedImages.s3KeyBgRemoved,
      s3KeyUpscaled: schema.generatedImages.s3KeyUpscaled,
      selectedVariationId: schema.generatedImages.selectedVariationId,
    })
    .from(schema.generatedImages)
    .innerJoin(schema.imagePrompts, eq(schema.generatedImages.promptId, schema.imagePrompts.id))
    .innerJoin(schema.themes, eq(schema.imagePrompts.themeId, schema.themes.id))
    .where(and(
      eq(schema.themes.projectId, project.id),
      eq(schema.generatedImages.status, 'active'),
    ))

  // Get all selected active prompts for the winner themes of this project
  const winnerThemes = await db.query.themes.findMany({
    where: and(eq(schema.themes.projectId, project.id), eq(schema.themes.isWinner, true)),
  })

  let prompts: any[] = []
  if (winnerThemes.length > 0) {
    const winnerThemeIds = winnerThemes.map(t => t.id)
    prompts = await db
      .select({
        id: schema.imagePrompts.id,
        promptText: schema.imagePrompts.promptText,
        designLane: schema.imagePrompts.designLane,
        sloganText: schema.imagePrompts.sloganText,
        recommendedModel: schema.imagePrompts.recommendedModel,
        themeId: schema.themes.id,
        themeTitle: schema.themes.title,
      })
      .from(schema.imagePrompts)
      .innerJoin(schema.themes, eq(schema.imagePrompts.themeId, schema.themes.id))
      .where(and(
        inArray(schema.imagePrompts.themeId, winnerThemeIds),
        eq(schema.imagePrompts.isSelected, true),
        eq(schema.imagePrompts.status, 'active')
      ))
  }

  // Fetch variations for all images in one query, then group by image id.
  const imageIds = images.map((i) => i.id)
  const variationRows = imageIds.length > 0
    ? await db.query.imageVariations.findMany({
        where: inArray(schema.imageVariations.imageId, imageIds),
        orderBy: [desc(schema.imageVariations.createdAt)],
      })
    : []
  const s3On = isS3Configured()
  const variationsByImage = new Map<string, any[]>()
  for (const v of variationRows) {
    let url = v.url
    if (s3On && v.s3Key) {
      try { url = await getImageUrl(v.s3Key, 86400) } catch { /* keep original */ }
    }
    const list = variationsByImage.get(v.imageId) ?? []
    list.push({
      id: v.id,
      name: v.name,
      kind: v.kind,
      format: v.format,
      mimeType: v.mimeType,
      width: v.width,
      height: v.height,
      fileSize: v.fileSize,
      url,
      createdAt: v.createdAt,
    })
    variationsByImage.set(v.imageId, list)
  }

  // Resolve fresh signed S3 URLs for generated/bg-removed/upscaled; attach variations.
  const resolvedImages = await Promise.all(images.map(async (img) => {
    const resolved = { ...img } as Record<string, any>
    if (s3On) {
      if (img.s3KeyGenerated) {
        resolved.imageUrl = await getImageUrl(img.s3KeyGenerated, 86400)
      }
      if (img.s3KeyBgRemoved && img.bgRemovalStatus === 'completed') {
        resolved.bgRemovedUrl = await getImageUrl(img.s3KeyBgRemoved, 86400)
      }
      if (img.s3KeyUpscaled && img.upscaleStatus === 'completed') {
        resolved.upscaledUrl = await getImageUrl(img.s3KeyUpscaled, 86400)
      }
    }
    resolved.hasLegacyOriginal = !img.s3KeyGenerated
    delete resolved.s3KeyGenerated
    delete resolved.s3KeyBgRemoved
    delete resolved.s3KeyUpscaled
    resolved.variations = variationsByImage.get(img.id) ?? []
    return resolved
  }))

  return { images: resolvedImages, prompts }
})
