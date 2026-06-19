import { useDB, schema } from '~~/server/database'
import { eq, and, like } from 'drizzle-orm'

/**
 * Convert a string into a URL-friendly slug.
 * E.g. "Syntax Sorcerer"  → "syntax-sorcerer"
 *      "Hello, World! 123" → "hello-world-123"
 */
export function slugify(input: string): string {
    return input
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')   // remove non-word chars (except spaces & hyphens)
        .replace(/[\s_]+/g, '-')    // spaces / underscores → hyphens
        .replace(/-+/g, '-')        // collapse multiple hyphens
        .replace(/^-|-$/g, '')      // trim leading/trailing hyphens
}

/**
 * Generate a unique slug for a project within a user's scope.
 * If "my-project" already exists, returns "my-project-2", then "my-project-3", etc.
 * Optionally pass `excludeProjectId` to ignore a specific project (useful for renames).
 */
export async function generateUniqueSlug(
    userId: string,
    name: string,
    excludeProjectId?: string,
): Promise<string> {
    const db = useDB()
    const base = slugify(name)
    if (!base) return crypto.randomUUID().split('-')[0]!

    // Fetch all slugs matching the base pattern for this user
    const existing = await db
        .select({ slug: schema.projects.slug, id: schema.projects.id })
        .from(schema.projects)
        .where(and(
            eq(schema.projects.userId, userId),
            like(schema.projects.slug, `${base}%`),
        ))

    const takenSlugs = new Set(
        existing
            .filter((row) => !excludeProjectId || row.id !== excludeProjectId)
            .map((row) => row.slug)
    )

    if (!takenSlugs.has(base)) return base

    let counter = 2
    while (takenSlugs.has(`${base}-${counter}`)) {
        counter++
    }
    return `${base}-${counter}`
}
