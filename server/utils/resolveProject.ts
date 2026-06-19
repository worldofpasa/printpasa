import { useDB, schema } from '~~/server/database'
import { eq, and } from 'drizzle-orm'

/**
 * Resolve a project by its slug.
 * Superusers can resolve any project; regular users only their own.
 * Returns the full project row or throws a 404 error.
 */
export async function resolveProjectBySlug(user: { id: string; isSuperuser?: boolean }, slug: string) {
    const db = useDB()

    const project = await db.query.projects.findFirst({
        where: user.isSuperuser
            ? eq(schema.projects.slug, slug)
            : and(eq(schema.projects.slug, slug), eq(schema.projects.userId, user.id)),
    })

    if (!project) {
        throw createError({ statusCode: 404, statusMessage: 'Project not found' })
    }

    return project
}

export function assertProjectWritable(project: { status: string }) {
    if (project.status === 'archived') {
        throw createError({
            statusCode: 409,
            statusMessage: 'Project is archived — unarchive to make changes',
        })
    }
}

export async function resolveProjectById(user: { id: string; isSuperuser?: boolean }, id: string) {
    const db = useDB()

    const project = await db.query.projects.findFirst({
        where: user.isSuperuser
            ? eq(schema.projects.id, id)
            : and(eq(schema.projects.id, id), eq(schema.projects.userId, user.id)),
    })

    if (!project) {
        throw createError({ statusCode: 404, statusMessage: 'Project not found' })
    }

    return project
}

export async function resolveWritableProjectById(user: { id: string; isSuperuser?: boolean }, id: string) {
    const project = await resolveProjectById(user, id)
    assertProjectWritable(project)
    return project
}
