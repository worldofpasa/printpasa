import { useDB, schema } from '~~/server/database'
import { desc, eq } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = useDB()

  // Superusers see all projects with owner info
  if (user.isSuperuser) {
    const allProjects = await db
      .select({
        id: schema.projects.id,
        userId: schema.projects.userId,
        name: schema.projects.name,
        slug: schema.projects.slug,
        description: schema.projects.description,
        currentStage: schema.projects.currentStage,
        trendSource: schema.projects.trendSource,
        niche: schema.projects.niche,
        customNiche: schema.projects.customNiche,
        themeCount: schema.projects.themeCount,
        aiProvider: schema.projects.aiProvider,
        imageProvider: schema.projects.imageProvider,
        fulfillmentProvider: schema.projects.fulfillmentProvider,
        status: schema.projects.status,
        originSource: schema.projects.originSource,
        originActor: schema.projects.originActor,
        originMeta: schema.projects.originMeta,
        createdAt: schema.projects.createdAt,
        updatedAt: schema.projects.updatedAt,
        ownerName: schema.users.name,
        ownerEmail: schema.users.email,
      })
      .from(schema.projects)
      .leftJoin(schema.users, eq(schema.projects.userId, schema.users.id))
      .orderBy(desc(schema.projects.createdAt))

    return allProjects
  }

  // Regular users see only their own projects
  const projects = await db.query.projects.findMany({
    where: eq(schema.projects.userId, user.id),
    orderBy: desc(schema.projects.createdAt),
  })

  return projects
})
