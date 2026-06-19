import { z } from 'zod'
import { eq } from 'drizzle-orm'
import sharp from 'sharp'
// @ts-expect-error - potrace has no bundled types
import potrace from 'potrace'
import { useDB, schema } from '~~/server/database'
import {
  uploadImage,
  getImageUrl,
  isS3Configured,
  buildImageFilename,
  extractBaseFilename,
} from '~~/server/services/storage/s3'
import { resolveImageForUser, stageForKind } from './_util'

const bodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  sourceVariationId: z.string().optional().nullable(),
  threshold: z.number().int().min(0).max(255).default(128),
  color: z.string().default('#000000'),
  background: z.string().optional().nullable(),
  turdSize: z.number().int().min(0).max(100).default(2),
  optTolerance: z.number().min(0).max(10).default(0.2),
  parentVariationId: z.string().optional().nullable(),
})

function traceAsync(buf: Buffer, opts: Record<string, any>): Promise<string> {
  return new Promise((resolve, reject) => {
    potrace.trace(buf, opts, (err: Error | null, svg: string) => {
      if (err) reject(err)
      else resolve(svg)
    })
  })
}

function parseSvgDimensions(svg: string): { width: number | null; height: number | null } {
  const widthMatch = svg.match(/<svg\b[^>]*\bwidth="(\d+(?:\.\d+)?)"/i)
  const heightMatch = svg.match(/<svg\b[^>]*\bheight="(\d+(?:\.\d+)?)"/i)
  const vbMatch = svg.match(/<svg\b[^>]*\bviewBox="[\d.\s-]*?(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)"/i)
  const width = widthMatch ? Math.round(Number(widthMatch[1])) : vbMatch ? Math.round(Number(vbMatch[1])) : null
  const height = heightMatch ? Math.round(Number(heightMatch[1])) : vbMatch ? Math.round(Number(vbMatch[2])) : null
  return { width, height }
}

async function fetchSourceBuffer(url: string): Promise<Buffer> {
  if (url.startsWith('data:')) {
    const b64 = url.split(',')[1] ?? ''
    return Buffer.from(b64, 'base64')
  }
  const res = await fetch(url)
  if (!res.ok) throw createError({ statusCode: 502, statusMessage: `Failed to fetch source image (${res.status})` })
  return Buffer.from(await res.arrayBuffer())
}

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'projectId')!
  const imageId = getRouterParam(event, 'imageId')!
  const body = await readValidatedBody(event, bodySchema.parse)
  const db = useDB()

  const { project, image, theme } = await resolveImageForUser(event, projectId, imageId)

  // Resolve source URL.
  let sourceUrl: string | null = null
  if (body.sourceVariationId) {
    const v = await db.query.imageVariations.findFirst({
      where: eq(schema.imageVariations.id, body.sourceVariationId),
    })
    if (!v || v.imageId !== imageId) {
      throw createError({ statusCode: 404, statusMessage: 'Source variation not found' })
    }
    // Prefer a fresh signed URL if we have an s3Key.
    sourceUrl = v.s3Key && isS3Configured() ? await getImageUrl(v.s3Key, 3600) : v.url
  } else {
    sourceUrl = image.bgRemovedUrl || image.imageUrl
  }
  if (!sourceUrl) {
    throw createError({ statusCode: 400, statusMessage: 'No source image to trace' })
  }

  const rawBuf = await fetchSourceBuffer(sourceUrl)

  // Normalize with sharp: flatten to background if specified, else keep alpha.
  let normalized: Buffer
  try {
    let pipeline = sharp(rawBuf)
    if (body.background) {
      pipeline = pipeline.flatten({ background: body.background })
    }
    normalized = await pipeline.png().toBuffer()
  } catch (e: any) {
    throw createError({ statusCode: 400, statusMessage: `sharp failed to normalize source: ${e?.message ?? e}` })
  }

  // Trace.
  let svg: string
  try {
    svg = await traceAsync(normalized, {
      threshold: body.threshold,
      color: body.color,
      background: body.background ?? 'transparent',
      turdSize: body.turdSize,
      optTolerance: body.optTolerance,
    })
  } catch (e: any) {
    throw createError({ statusCode: 500, statusMessage: `potrace failed: ${e?.message ?? e}` })
  }

  const svgBuf = Buffer.from(svg, 'utf8')
  const dims = parseSvgDimensions(svg)

  // Upload.
  let s3Key: string | null = null
  let url: string
  if (isS3Configured()) {
    const baseFilename = image.s3KeyGenerated
      ? extractBaseFilename(image.s3KeyGenerated)
      : buildImageFilename(theme.slug ?? 'image', 0)
    const filename = `${baseFilename}_traced_${Date.now()}`
    s3Key = await uploadImage(
      project.slug || projectId,
      stageForKind('traced'),
      filename,
      svgBuf,
      'image/svg+xml',
    )
    url = await getImageUrl(s3Key, 86400)
  } else {
    url = `data:image/svg+xml;base64,${svgBuf.toString('base64')}`
  }

  const id = crypto.randomUUID()
  const now = new Date()

  const [row] = await db.insert(schema.imageVariations).values({
    id,
    imageId,
    parentVariationId: body.parentVariationId ?? body.sourceVariationId ?? null,
    name: body.name,
    kind: 'traced',
    format: 'svg',
    mimeType: 'image/svg+xml',
    width: dims.width,
    height: dims.height,
    fileSize: svgBuf.byteLength,
    s3Key,
    url,
    metadata: JSON.stringify({
      trace: {
        threshold: body.threshold,
        color: body.color,
        background: body.background ?? null,
        turdSize: body.turdSize,
        optTolerance: body.optTolerance,
        sourceVariationId: body.sourceVariationId ?? null,
      },
    }),
    createdAt: now,
    updatedAt: now,
  }).returning()

  setResponseStatus(event, 201)
  return { variation: row }
})
