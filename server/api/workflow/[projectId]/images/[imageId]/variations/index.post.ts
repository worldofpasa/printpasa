import { z } from 'zod'
import { useDB, schema } from '~~/server/database'
import {
  uploadImage,
  getImageUrl,
  isS3Configured,
  buildImageFilename,
  extractBaseFilename,
} from '~~/server/services/storage/s3'
import {
  resolveImageForUser,
  decodeBlob,
  extractDimensions,
  stageForKind,
  extForFormat,
  contentTypeForFormat,
  syncQuickRefColumn,
  type VariationKind,
} from './_util'

const bodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  kind: z.enum(['bg-removed', 'upscaled', 'edited', 'composite', 'traced']),
  format: z.enum(['png', 'svg']).default('png'),
  blob: z.string().min(1),
  parentVariationId: z.string().optional().nullable(),
  metadata: z.unknown().optional(),
})

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'projectId')!
  const imageId = getRouterParam(event, 'imageId')!
  const body = await readValidatedBody(event, bodySchema.parse)
  const db = useDB()

  const { project, image, theme } = await resolveImageForUser(event, projectId, imageId)

  const kind = body.kind as VariationKind
  const format = body.format
  const buffer = decodeBlob(body.blob)
  const { width, height, fileSize, mimeType } = await extractDimensions(buffer, format)

  let s3Key: string | null = null
  let url: string

  if (isS3Configured()) {
    // Derive a base filename from the source image's existing key if possible;
    // otherwise build a fresh one from theme slug.
    const baseFilename = image.s3KeyGenerated
      ? extractBaseFilename(image.s3KeyGenerated)
      : buildImageFilename(theme.slug ?? 'image', 0)

    const filename = `${baseFilename}_var_${Date.now()}`
    s3Key = await uploadImage(
      project.slug || projectId,
      stageForKind(kind),
      filename,
      buffer,
      contentTypeForFormat(format),
    )
    url = await getImageUrl(s3Key, 86400)
  } else {
    // S3 not configured — inline as data URL. Suitable for dev only.
    url = `data:${contentTypeForFormat(format)};base64,${buffer.toString('base64')}`
  }

  const id = crypto.randomUUID()
  const now = new Date()

  const [row] = await db.insert(schema.imageVariations).values({
    id,
    imageId,
    parentVariationId: body.parentVariationId ?? null,
    name: body.name,
    kind,
    format,
    mimeType,
    width,
    height,
    fileSize,
    s3Key,
    url,
    metadata: body.metadata === undefined ? null : JSON.stringify(body.metadata),
    createdAt: now,
    updatedAt: now,
  }).returning()

  if (row) {
    await syncQuickRefColumn(imageId, { kind: row.kind, url: row.url, s3Key: row.s3Key })
  }

  setResponseStatus(event, 201)
  return { variation: row }
})
