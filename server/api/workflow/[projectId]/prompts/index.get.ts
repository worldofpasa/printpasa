import { useDB, schema } from '~~/server/database'
import { eq, and, inArray } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'
import { resolveProjectById } from '~~/server/utils/resolveProject'

export default defineEventHandler(async (event) => {
    const user = await requireUser(event)
    const projectId = getRouterParam(event, 'projectId')!
    const db = useDB()

    // 1. Verify project exists and user has access (handles superuser bypass)
    const project = await resolveProjectById(user, projectId)

    // 2. Get all themes for this project
    const projectThemes = await db.query.themes.findMany({
        where: eq(schema.themes.projectId, project.id),
    })

    if (projectThemes.length === 0) {
        return { prompts: [] }
    }

    // 3. Get active prompts for these themes (superseded prompts are preserved but hidden)
    const prompts = await db.query.imagePrompts.findMany({
        where: and(
            inArray(schema.imagePrompts.themeId, projectThemes.map(t => t.id)),
            eq(schema.imagePrompts.status, 'active'),
        ),
        orderBy: (prompts, { asc }) => [asc(prompts.sortOrder), asc(prompts.createdAt)]
    })

    return { prompts }
})
