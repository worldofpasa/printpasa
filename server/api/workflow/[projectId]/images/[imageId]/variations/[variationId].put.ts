import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDB, schema } from '~~/server/database'
import {
  uploadImage,
  uploadImageAtKey,
  getImageUrl,
  isS3Configured,
  buildImageFilename,
  extractBaseFilename,
} from '~~/server/services/storage/s3'
import {
  resolveVariationForUser,
  decodeBlob,
  extractDimensions,
  stageForKind,
  contentTypeForFormat,
  syncQuickRefColumn,
  type VariationKind,
} from './_util'

const bodySchema = z.object({
  blob: z.string().min(1),
  format: z.enum(['png', 'svg']).optional(),
  metadata: z.unknown().optional(),
})

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'projectId')!
  const imageId = getRouterParam(event, 'imageId')!
  const variationId = getRouterParam(event, 'variationId')!
  const body = await readValidatedBody(event, bodySchema.parse)

  const { project, image, theme, variation } = await resolveVariationForUser(event, projectId, imageId, variationId)

  const format = body.format ?? variation.format as 'png' | 'svg'
  const buffer = decodeBlob(body.blob)
  const { width, height, fileSize, mimeType } = await extractDimensions(buffer, format)

  let s3Key = variation.s3Key
  let url = variation.url

  if (isS3Configured()) {
    if (s3Key) {
      await uploadImageAtKey(s3Key, buffer, contentTypeForFormat(format))
    } else {
      const baseFilename = image.s3KeyGenerated
        ? extractBaseFilename(image.s3KeyGenerated)
        : buildImageFilename(theme.slug ?? 'image', 0)
      const filename = `${baseFilename}_var_${Date.now()}`
      s3Key = await uploadImage(
        project.slug || projectId,
        stageForKind(variation.kind as VariationKind),
        filename,
        buffer,
        contentTypeForFormat(format),
      )
    }
    url = await getImageUrl(s3Key, 86400)
  } else {
    url = `data:${contentTypeForFormat(format)};base64,${buffer.toString('base64')}`
  }

  const db = useDB()
  const [row] = await db.update(schema.imageVariations)
    .set({
      format,
      mimeType,
      width,
      height,
      fileSize,
      s3Key,
      url,
      metadata: body.metadata === undefined ? variation.metadata : JSON.stringify(body.metadata),
      updatedAt: new Date(),
    })
    .where(eq(schema.imageVariations.id, variationId))
    .returning()

  if (row) {
    await syncQuickRefColumn(imageId, { kind: row.kind, url: row.url, s3Key: row.s3Key })
  }

  return { variation: row }
})
