import { useDB, schema } from '~~/server/database'
import { eq, inArray, and } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'
import { resolveWritableProjectById } from '~~/server/utils/resolveProject'
import { generateUniqueSlug } from '~~/server/utils/slugify'
import { z } from 'zod'
import { WORKFLOW_STAGES, STAGE_INDEX } from '~~/shared/types/workflow'

const bodySchema = z.object({
    targetStage: z.enum(WORKFLOW_STAGES as any),
    name: z.string().min(1).max(200).optional(),
})

export default defineEventHandler(async (event) => {
    const user = await requireUser(event)
    const projectId = getRouterParam(event, 'projectId')!
    const body = await readValidatedBody(event, bodySchema.parse)
    const db = useDB()

    const parentProject = await resolveWritableProjectById(user, projectId)

    const newProjectId = crypto.randomUUID()
    const shortHash = crypto.randomUUID().split('-')[0]

    const forkName = body.name?.trim() || `${parentProject.name} (Fork ${shortHash})`

    const [newProject] = await db.insert(schema.projects).values({
        ...parentProject,
        id: newProjectId,
        name: forkName,
        slug: await generateUniqueSlug(user.id, forkName),
        currentStage: body.targetStage,
        status: 'active',
        originSource: 'portal',
        originActor: user.name || user.email,
        originMeta: JSON.stringify({ userId: user.id, forkedFrom: projectId }),
        createdAt: new Date(),
        updatedAt: new Date(),
    }).returning()

    // 1. Copy themes
    const parentThemes = await db.query.themes.findMany({
        where: eq(schema.themes.projectId, projectId)
    })

    const themeMap = new Map<string, string>()

    if (parentThemes.length > 0) {
        for (const theme of parentThemes) {
            const newThemeId = crypto.randomUUID()
            themeMap.set(theme.id, newThemeId)
            await db.insert(schema.themes).values({
                ...theme,
                id: newThemeId,
                projectId: newProjectId,
                createdAt: new Date(),
            })
        }
    }

    // 2. Copy active prompts only (superseded prompts stay in the parent)
    const promptMap = new Map<string, string>()
    if (STAGE_INDEX[body.targetStage as keyof typeof STAGE_INDEX] >= STAGE_INDEX['image-prompts'] && parentThemes.length > 0) {
        const parentPrompts = await db.query.imagePrompts.findMany({
            where: and(
                inArray(schema.imagePrompts.themeId, parentThemes.map(t => t.id)),
                eq(schema.imagePrompts.status, 'active'),
            )
        })
        for (const p of parentPrompts) {
            const newPromptId = crypto.randomUUID()
            promptMap.set(p.id, newPromptId)
            await db.insert(schema.imagePrompts).values({
                ...p,
                id: newPromptId,
                themeId: themeMap.get(p.themeId)!,
                createdAt: new Date(),
            })
        }
    }

    // 3. Copy active images only
    const imageMap = new Map<string, string>()
    if (STAGE_INDEX[body.targetStage as keyof typeof STAGE_INDEX] >= STAGE_INDEX['image-generate'] && promptMap.size > 0) {
        const parentImages = await db.query.generatedImages.findMany({
            where: and(
                inArray(schema.generatedImages.promptId, Array.from(promptMap.keys())),
                eq(schema.generatedImages.status, 'active'),
            )
        })
        for (const img of parentImages) {
            const newImageId = crypto.randomUUID()
            imageMap.set(img.id, newImageId)
            await db.insert(schema.generatedImages).values({
                ...img,
                id: newImageId,
                promptId: promptMap.get(img.promptId)!,
                createdAt: new Date(),
            })
        }
    }

    // 4. Copy Products
    if (STAGE_INDEX[body.targetStage as keyof typeof STAGE_INDEX] >= STAGE_INDEX['product-placement'] && imageMap.size > 0) {
        const parentProducts = await db.query.products.findMany({
            where: eq(schema.products.projectId, projectId)
        })
        for (const prod of parentProducts) {
            const newProductId = crypto.randomUUID()
            await db.insert(schema.products).values({
                ...prod,
                id: newProductId,
                projectId: newProjectId,
                imageId: imageMap.get(prod.imageId) || prod.imageId,
                sku: `${prod.sku}-${shortHash}`,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
        }
    }

    return newProject
})
