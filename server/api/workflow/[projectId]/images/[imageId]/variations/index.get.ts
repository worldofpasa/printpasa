import { desc, eq } from 'drizzle-orm'
import { useDB, schema } from '~~/server/database'
import { getImageUrl } from '~~/server/services/storage/s3'
import { resolveImageForUser } from './_util'

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'projectId')!
  const imageId = getRouterParam(event, 'imageId')!
  await resolveImageForUser(event, projectId, imageId)

  const db = useDB()
  const rows = await db.query.imageVariations.findMany({
    where: eq(schema.imageVariations.imageId, imageId),
    orderBy: [desc(schema.imageVariations.createdAt)],
  })

  // Refresh signed URLs for S3-backed rows so the caller always gets a usable URL.
  const variations = await Promise.all(rows.map(async (row) => {
    if (row.s3Key) {
      try {
        const fresh = await getImageUrl(row.s3Key, 86400)
        return { ...row, url: fresh }
      } catch {
        return row
      }
    }
    return row
  }))

  return { variations }
})
