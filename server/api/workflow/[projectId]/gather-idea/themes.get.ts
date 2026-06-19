import { useDB, schema } from '~~/server/database'
import { eq, and } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'
import { resolveProjectById } from '~~/server/utils/resolveProject'

export default defineEventHandler(async (event) => {
    const user = await requireUser(event)
    const projectId = getRouterParam(event, 'projectId')!
    const db = useDB()

    // Verify project ownership
    const project = await resolveProjectById(user, projectId)

    // Fetch existing themes for this project
    const themes = await db.query.themes.findMany({
        where: eq(schema.themes.projectId, project.id),
        orderBy: (themes, { asc }) => [asc(themes.sortOrder)],
    })

    return {
        themes,
        count: themes.length,
    }
})
