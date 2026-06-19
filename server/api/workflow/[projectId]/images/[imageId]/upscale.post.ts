import { useDB, schema } from '~~/server/database'
import { eq } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'
import { resolveWritableProjectById } from '~~/server/utils/resolveProject'
import { createUpscaleProvider } from '~~/server/services/image-upscaler'
import { uploadImage, appendUpscaledSuffix, extractBaseFilename, isS3Configured, getImageUrl } from '~~/server/services/storage/s3'
import { resolveProvidersForCapability } from '~~/server/utils/provider-registry'
import sharp from 'sharp'
import { z } from 'zod'

type AlphaMask = { data: Buffer; width: number; height: number }

async function fetchBytes(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Fetch failed ${res.status}: ${res.statusText}`)
  return Buffer.from(await res.arrayBuffer())
}

type SourceInspection = {
  width: number
  height: number
  alpha: AlphaMask | null
}

/**
 * Fetch the source once and extract both its dimensions and (optionally) its
 * alpha mask. Dimensions are needed by providers whose request body expects
 * target output size. Alpha is captured so we can paste it back
 * onto providers that flatten transparency internally (Photoroom, real-esrgan).
 */
async function inspectSource(sourceUrl: string): Promise<SourceInspection | null> {
  const sourceBuf = await fetchBytes(sourceUrl)
  const meta = await sharp(sourceBuf).metadata()
  if (!meta.width || !meta.height) return null

  let alpha: AlphaMask | null = null
  if (meta.hasAlpha) {
    const maskBuf = await sharp(sourceBuf).extractChannel('alpha').raw().toBuffer()
    alpha = { data: maskBuf, width: meta.width, height: meta.height }
  }

  return { width: meta.width, height: meta.height, alpha }
}

/**
 * Resize the preserved alpha mask to the upscaled image's dimensions and splice
 * it in as the alpha channel, byte-by-byte. Explicit byte manipulation because
 * sharp's joinChannel() sometimes fails to mark the 4th channel as alpha in
 * the output PNG (showed up as black-background renders in the browser).
 */
async function rejoinAlpha(upscaledUrl: string, mask: AlphaMask): Promise<string> {
  const upscaledBuf = upscaledUrl.startsWith('data:')
    ? Buffer.from(upscaledUrl.split(',')[1]!, 'base64')
    : await fetchBytes(upscaledUrl)

  // Force RGBA so we have a guaranteed alpha byte to overwrite.
  const { data: rgba, info } = await sharp(upscaledBuf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const W = info.width
  const H = info.height
  if (info.channels !== 4) throw new Error(`Unexpected channel count after ensureAlpha: ${info.channels}`)

  // Sharp's resize of a 1-channel raw buffer may output 3-channel RGB in some
  // versions/configs. Read whatever channels it gives us and take the first
  // byte per pixel (all channels are identical when input was grayscale).
  const resized = await sharp(mask.data, {
    raw: { width: mask.width, height: mask.height, channels: 1 },
  })
    .resize(W, H, { kernel: 'lanczos3' })
    .raw()
    .toBuffer({ resolveWithObject: true })

  const stride = resized.info.channels
  if (resized.data.length !== W * H * stride) {
    throw new Error(`Resized mask size mismatch: ${resized.data.length} vs ${W * H * stride} (${stride}ch)`)
  }

  for (let i = 0; i < W * H; i++) {
    rgba[i * 4 + 3] = resized.data[i * stride]!
  }

  const withAlpha = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
    .png()
    .toBuffer()

  return `data:image/png;base64,${withAlpha.toString('base64')}`
}

const bodySchema = z.object({
  provider: z.string().optional(),
  scaleFactor: z.number().int().min(1).max(8).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const projectId = getRouterParam(event, 'projectId')!
  const imageId = getRouterParam(event, 'imageId')!
  const body = await readValidatedBody(event, (payload) => bodySchema.parse(payload ?? {}))
  const db = useDB()

  const project = await resolveWritableProjectById(user, projectId)

  // Get image
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

  const providers = await resolveProvidersForCapability('upscale', {
    settings: settings as any,
    config: config as any,
    preferredProviderId: body.provider,
    defaultSettingsKey: 'defaultUpscaleProvider',
    defaultConfigKey: 'defaultUpscaleProvider',
  })

  if (providers.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No upscale provider is configured with an API key. Enable one in Settings or set an environment variable.',
    })
  }

  // If user explicitly chose a provider, only try that one
  const candidates = body.provider
    ? providers.filter((p) => p.id === body.provider)
    : providers

  if (candidates.length === 0) {
    throw createError({ statusCode: 400, statusMessage: `Upscale provider "${body.provider}" is not available. Check that it is enabled and has an API key.` })
  }

  const scaleFactor = body.scaleFactor ?? 4
  const errors: string[] = []

  for (const { id: providerName, apiKey } of candidates) {
    try {
      const provider = createUpscaleProvider(providerName as any, apiKey)
      // Use background removed image if available, falling back to original
      // If S3 key exists, generate a fresh signed URL (bgRemovedUrl may be expired)
      let sourceUrl = image.imageUrl
      if (image.s3KeyBgRemoved) {
        sourceUrl = await getImageUrl(image.s3KeyBgRemoved, 3600)
      } else if (image.bgRemovedUrl) {
        sourceUrl = image.bgRemovedUrl
      }

      // Inspect the source once: dimensions (for providers that want target
      // size) + alpha mask (for providers that flatten transparency).
      let inspection: SourceInspection | null = null
      try {
        inspection = await inspectSource(sourceUrl)
      } catch (e) {
        console.warn(`[upscale:${providerName}] source inspection failed, using DB dimensions:`, e)
      }

      // Providers handle their own input prep. We pass the original source URL
      // and let the provider class deal with provider-specific quirks.
      const result = await provider.upscale(sourceUrl, {
        scaleFactor,
        sourceWidth: inspection?.width ?? image.width ?? undefined,
        sourceHeight: inspection?.height ?? image.height ?? undefined,
      })

      if (inspection?.alpha) {
        try {
          result.imageUrl = await rejoinAlpha(result.imageUrl, inspection.alpha)
        } catch (e) {
          console.warn(`[upscale:${providerName}] alpha reapply failed, keeping raw upscale:`, e)
        }
      }

      const updateData: Record<string, any> = {
        upscaledUrl: result.imageUrl,
        upscaleStatus: 'completed',
        upscaleError: null,
      }
      // Assuming upscaling might change dimensions, we can store these in metadata or just leave them as they primarily refer to the original gen
      // For now we'll just store the URL and keys

      // Upload to S3 if configured — derive upscaled filename from original S3 key
      if (isS3Configured()) {
        try {
          let imgBuffer: Buffer
          if (result.imageUrl.startsWith('data:')) {
            const b64Data = result.imageUrl.split(',')[1]
            if (b64Data) {
              imgBuffer = Buffer.from(b64Data, 'base64')
            } else {
              throw new Error('Invalid data URI from upscale provider')
            }
          } else {
            const imgRes = await fetch(result.imageUrl)
            imgBuffer = Buffer.from(await imgRes.arrayBuffer())
          }
          const baseFilename = image.s3KeyGenerated
            ? appendUpscaledSuffix(extractBaseFilename(image.s3KeyGenerated))
            : appendUpscaledSuffix(imageId)
          const s3Key = await uploadImage(project.slug || projectId, 'upscaled', baseFilename, imgBuffer)
          updateData.s3KeyUpscaled = s3Key
          // Replace data URI with S3 signed URL so it's fetchable by downstream services
          if (result.imageUrl.startsWith('data:')) {
            const signedUrl = await getImageUrl(s3Key, 86400)
            updateData.upscaledUrl = signedUrl
          }
        } catch (s3Err) {
          console.error(`S3 upload failed for upscaled image ${imageId}:`, s3Err)
        }
      }

      await db.update(schema.generatedImages)
        .set(updateData)
        .where(eq(schema.generatedImages.id, imageId))

      return {
        success: true,
        image: {
          ...image,
          upscaledUrl: result.imageUrl,
          upscaleStatus: 'completed',
          upscaleError: null
        }
      }
    } catch (error: any) {
      const message = error?.message ?? 'Upscale failed'
      errors.push(`${providerName}: ${message}`)

      await db.update(schema.generatedImages)
        .set({ upscaleStatus: 'failed', upscaleError: message })
        .where(eq(schema.generatedImages.id, imageId))
    }
  }

  throw createError({
    statusCode: 500,
    statusMessage: `Upscale failed. ${errors.join(' | ')}`,
  })
})
