import { useDB, schema } from '~~/server/database'
import { eq, and, count } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'
import { resolveProjectById } from '~~/server/utils/resolveProject'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const projectId = getRouterParam(event, 'projectId')!
  const db = useDB()

  const project = await resolveProjectById(user, projectId)

  // Count items at each stage for transition guards
  const [selectedThemes] = await db
    .select({ count: count() })
    .from(schema.themes)
    .where(and(eq(schema.themes.projectId, project.id), eq(schema.themes.isSelected, true)))

  const [winners] = await db
    .select({ count: count() })
    .from(schema.themes)
    .where(and(eq(schema.themes.projectId, project.id), eq(schema.themes.isWinner, true)))

  const [selectedPrompts] = await db
    .select({ count: count() })
    .from(schema.imagePrompts)
    .innerJoin(schema.themes, eq(schema.imagePrompts.themeId, schema.themes.id))
    .where(and(
      eq(schema.themes.projectId, project.id),
      eq(schema.imagePrompts.isSelected, true),
      eq(schema.imagePrompts.status, 'active'),
    ))

  const [selectedImages] = await db
    .select({ count: count() })
    .from(schema.generatedImages)
    .innerJoin(schema.imagePrompts, eq(schema.generatedImages.promptId, schema.imagePrompts.id))
    .innerJoin(schema.themes, eq(schema.imagePrompts.themeId, schema.themes.id))
    .where(and(
      eq(schema.themes.projectId, project.id),
      eq(schema.generatedImages.isSelected, true),
      eq(schema.generatedImages.status, 'active'),
      eq(schema.generatedImages.generationStatus, 'completed'),
    ))

  const [createdProducts] = await db
    .select({ count: count() })
    .from(schema.products)
    .where(eq(schema.products.projectId, project.id))

  return {
    currentStage: project.currentStage,
    selectedThemeCount: selectedThemes?.count ?? 0,
    winnerCount: winners?.count ?? 0,
    selectedPromptCount: selectedPrompts?.count ?? 0,
    selectedImageCount: selectedImages?.count ?? 0,
    createdProductCount: createdProducts?.count ?? 0,
  }
})
