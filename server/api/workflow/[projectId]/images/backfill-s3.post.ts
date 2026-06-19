import { eq, and, isNull } from 'drizzle-orm'
import { useDB, schema } from '~~/server/database'
import { requireUser } from '~~/server/utils/auth'
import { resolveWritableProjectById } from '~~/server/utils/resolveProject'
import {
  uploadImage,
  isS3Configured,
  buildImageFilename,
} from '~~/server/services/storage/s3'

const MAX_PER_INVOCATION = 500
const THROTTLE_MS = 100

async function fetchBytes(url: string): Promise<Buffer> {
  if (url.startsWith('data:')) {
    const b64 = url.split(',')[1] ?? ''
    return Buffer.from(b64, 'base64')
  }
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Upstream ${res.status}: ${url}`)
  return Buffer.from(await res.arrayBuffer())
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)) }

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const projectId = getRouterParam(event, 'projectId')!
  const project = await resolveWritableProjectById(user, projectId)
  const db = useDB()

  if (!isS3Configured()) {
    return { total: 0, succeeded: 0, failed: 0, failures: [], reason: 's3-not-configured' as const }
  }

  // Select rows via prompt→theme→project chain that need backfilling.
  const rows = await db
    .select({
      id: schema.generatedImages.id,
      imageUrl: schema.generatedImages.imageUrl,
      themeSlug: schema.themes.slug,
    })
    .from(schema.generatedImages)
    .innerJoin(schema.imagePrompts, eq(schema.generatedImages.promptId, schema.imagePrompts.id))
    .innerJoin(schema.themes, eq(schema.imagePrompts.themeId, schema.themes.id))
    .where(and(
      eq(schema.themes.projectId, project.id),
      eq(schema.generatedImages.status, 'active'),
      isNull(schema.generatedImages.s3KeyGenerated),
    ))

  const total = rows.length
  const capped = rows.slice(0, MAX_PER_INVOCATION)
  const failures: Array<{ imageId: string; reason: string }> = []
  let succeeded = 0

  for (let i = 0; i < capped.length; i++) {
    const row = capped[i]!
    try {
      if (!row.imageUrl) throw new Error('row has no imageUrl')
      const buf = await fetchBytes(row.imageUrl)
      const baseFilename = buildImageFilename(row.themeSlug ?? 'image', 0) + '_backfill'
      const s3Key = await uploadImage(project.slug || projectId, 'generated', baseFilename, buf)

      await db.update(schema.generatedImages)
        .set({ s3KeyGenerated: s3Key })
        .where(eq(schema.generatedImages.id, row.id))

      succeeded++
    } catch (err: any) {
      failures.push({ imageId: row.id, reason: String(err?.message ?? err) })
    }
    if (i < capped.length - 1) await sleep(THROTTLE_MS)
  }

  return {
    total,
    attempted: capped.length,
    succeeded,
    failed: failures.length,
    failures,
    remaining: Math.max(0, total - capped.length),
  }
})
