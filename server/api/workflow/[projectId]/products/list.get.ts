import { useDB, schema } from '~~/server/database'
import { eq, and } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'
import { resolveProjectById } from '~~/server/utils/resolveProject'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const projectId = getRouterParam(event, 'projectId')!
  const db = useDB()

  const project = await resolveProjectById(user, projectId)

  const products = await db.query.products.findMany({
    where: eq(schema.products.projectId, project.id),
    orderBy: (products, { desc }) => [desc(products.createdAt)],
  })

  return { products }
})
