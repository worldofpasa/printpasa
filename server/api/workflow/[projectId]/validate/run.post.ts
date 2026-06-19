import { useDB, schema } from '~~/server/database'
import { eq, and } from 'drizzle-orm'
import { requireUser } from '~~/server/utils/auth'
import { getTextProviderForStage } from '~~/server/utils/ai'
import { buildValidateIdeaPrompt } from '~~/server/services/prompts'
import {
  getValidationProvidersForUser,
  checkTrademarkCached,
  checkBrandRiskCached,
  fetchEtsyMarketplaceValidation,
  marketplaceContextForPrompt,
} from '~~/server/services/validation'
import { resolveSearchCredentials } from '~~/server/services/idea-research/search-provider'
import { z } from 'zod'

const bodySchema = z.object({
  winnerCount: z.number().min(1).max(20).default(5),
  useTrademarkApi: z.boolean().optional(),
  useBrandRiskApi: z.boolean().optional(),
})

type ValidatedTheme = {
  title: string
  trendScore: number
  patentSafe: boolean
  copyrightSafe: boolean
  trademarkSafe: boolean
  validationNotes: string
  contextNotes: string
  targetDemographic: string
  isWinner: boolean
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const projectId = getRouterParam(event, 'projectId')!
  const body = await readValidatedBody(event, bodySchema.parse)
  const db = useDB()

  const project = await resolveWritableProjectById(user, projectId)

  // Resolve per-user toggles (body override > settings default).
  const settings = await db.query.userSettings.findFirst({
    where: eq(schema.userSettings.userId, user.id),
  })
  const toggles = {
    useTrademarkApi: body.useTrademarkApi ?? settings?.useTrademarkApi ?? false,
    useBrandRiskApi: body.useBrandRiskApi ?? settings?.useBrandRiskApi ?? false,
  }

  // Pre-flight: resolve API providers *before* calling LLM so a missing key
  // fails fast (400) rather than after burning an LLM call.
  const providers = await getValidationProvidersForUser(event, user.id, toggles)

  // Get selected themes from Stage 1
  const selectedThemes = await db.query.themes.findMany({
    where: and(eq(schema.themes.projectId, project.id), eq(schema.themes.isSelected, true)),
  })

  if (selectedThemes.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No themes selected. Go back to Stage 1.' })
  }

  const searchCreds = await resolveSearchCredentials(user.id)
  const etsyMarketplace = await fetchEtsyMarketplaceValidation(
    searchCreds,
    selectedThemes.map((t) => t.title),
  )
  const marketplaceContext = marketplaceContextForPrompt(etsyMarketplace)

  const ai = await getTextProviderForStage(event, user.id, 'validate', { projectId: project.id })
  const prompt = buildValidateIdeaPrompt({
    themes: selectedThemes.map((t) => ({
      title: t.title,
      description: t.description ?? '',
      targetDemographic: t.targetDemographic ?? undefined,
    })),
    winnerCount: body.winnerCount,
    marketplaceContext: marketplaceContext.length > 0 ? marketplaceContext : undefined,
  })

  const result = await ai.generateJSON<{ validatedThemes: ValidatedTheme[] }>({
    prompt: prompt.user,
    systemPrompt: prompt.system,
    temperature: 0.5,
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    throw createError({
      statusCode: 502,
      statusMessage: `AI validation failed: ${message}`,
    })
  })

  const anyApi = !!providers.trademark || !!providers.brandRisk

  // Build a per-title patch. Without API toggles we just persist LLM output as-is.
  const patchByTitle = new Map<string, ValidatedTheme>(
    result.validatedThemes.map((v) => [v.title, { ...v }]),
  )
  const apiCheckedTitles = new Set<string>()
  let rejectedByApiCount = 0

  if (anyApi) {
    // Hybrid gate: only run real APIs on top (winnerCount * 2) candidates
    // ranked by LLM trendScore. Anything else retains LLM result but is
    // forced to isWinner=false since it didn't go through real checks.
    const candidates = [...result.validatedThemes]
      .sort((a, b) => b.trendScore - a.trendScore)
      .slice(0, body.winnerCount * 2)

    for (const cand of candidates) {
      apiCheckedTitles.add(cand.title)
      const [tm, br] = await Promise.all([
        providers.trademark ? checkTrademarkCached(providers.trademark, cand.title) : Promise.resolve(null),
        providers.brandRisk ? checkBrandRiskCached(providers.brandRisk, cand.title) : Promise.resolve(null),
      ])

      const patched = patchByTitle.get(cand.title)!
      const notes: string[] = []
      if (patched.validationNotes) notes.push(patched.validationNotes)

      if (tm) {
        patched.trademarkSafe = tm.isSafe
        if (!tm.isSafe) {
          notes.push(
            `Trademark conflict (RapidAPI/USPTO class 025): ${tm.conflicts.join(', ') || 'live mark found'}`,
          )
        }
      }
      if (br) {
        // Brand-risk is the closest real-world signal for copyright/IP collision.
        patched.copyrightSafe = br.isSafe
        if (!br.isSafe) {
          notes.push(`Brand-risk (SerpAPI): ${br.riskLevel}${br.notes ? ` — ${br.notes}` : ''}`)
        }
      }
      patched.validationNotes = notes.join(' | ')
    }

    // Re-compute winners: first winnerCount candidates (in LLM rank order) that
    // pass all enabled API gates. Non-candidates can't win.
    let promoted = 0
    for (const cand of candidates) {
      const patched = patchByTitle.get(cand.title)!
      const tmOk = !providers.trademark || patched.trademarkSafe
      const brOk = !providers.brandRisk || patched.copyrightSafe
      const passed = tmOk && brOk
      if (!passed) rejectedByApiCount++
      patched.isWinner = passed && promoted < body.winnerCount
      if (patched.isWinner) promoted++
    }
    for (const v of patchByTitle.values()) {
      if (!apiCheckedTitles.has(v.title)) v.isWinner = false
    }
  }

  // Persist.
  for (const validated of patchByTitle.values()) {
    const theme = selectedThemes.find((t) => t.title === validated.title)
    if (theme) {
      await db.update(schema.themes).set({
        isValidated: true,
        trendScore: validated.trendScore,
        patentSafe: validated.patentSafe,
        copyrightSafe: validated.copyrightSafe,
        trademarkSafe: validated.trademarkSafe,
        validationNotes: validated.validationNotes,
        contextNotes: validated.contextNotes,
        targetDemographic: validated.targetDemographic,
        isWinner: validated.isWinner,
      }).where(eq(schema.themes.id, theme.id))
    }
  }

  const updatedThemes = await db.query.themes.findMany({
    where: and(eq(schema.themes.projectId, project.id), eq(schema.themes.isSelected, true)),
    orderBy: (themes, { desc }) => [desc(themes.trendScore)],
  })

  await db.update(schema.projects).set({
    validationSnapshot: JSON.stringify(etsyMarketplace),
    updatedAt: new Date(),
  }).where(eq(schema.projects.id, project.id))

  const apiCheckedIds = new Set(
    updatedThemes.filter((t) => apiCheckedTitles.has(t.title)).map((t) => t.id),
  )

  return {
    themes: updatedThemes,
    validation: {
      gates: {
        llm: true,
        trademark: !!providers.trademark,
        brandRisk: !!providers.brandRisk,
        etsy: etsyMarketplace.status !== 'skipped',
      },
      apiCheckedThemeIds: Array.from(apiCheckedIds),
      candidateCount: anyApi ? apiCheckedTitles.size : 0,
      rejectedByApi: rejectedByApiCount,
      marketplace: etsyMarketplace,
    },
  }
})
