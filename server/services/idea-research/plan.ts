import type { IAIProvider } from '../text-generation/types'
import { projectNameFromIdea } from '../telegram/parse-idea'
import { buildIdeaResearchPlanPrompt } from '../prompts/idea-research-plan'
import type { ResearchPlan } from './types'

export function fallbackResearchPlan(ideaDescription: string): ResearchPlan {
  const trimmed = ideaDescription.trim()
  return {
    projectTitle: projectNameFromIdea(trimmed),
    inferredAudience: trimmed.slice(0, 200),
    subreddits: [],
    keywords: { google: [], pinterest: [], tiktok: [] },
  }
}

export async function planIdeaResearch(
  ideaDescription: string,
  ai: IAIProvider,
): Promise<ResearchPlan> {
  const prompt = buildIdeaResearchPlanPrompt(ideaDescription)
  const result = await ai.generateJSON<ResearchPlan>({
    prompt: prompt.user,
    systemPrompt: prompt.system,
    temperature: 0.5,
  })

  return normalizePlan(result, ideaDescription)
}

export function normalizePlan(result: ResearchPlan, ideaDescription: string): ResearchPlan {
  const fallback = fallbackResearchPlan(ideaDescription)
  return {
    projectTitle: result.projectTitle?.trim() || fallback.projectTitle,
    inferredAudience: result.inferredAudience?.trim() || fallback.inferredAudience,
    subreddits: (result.subreddits ?? []).map(normalizeSubreddit).filter(Boolean).slice(0, 4),
    keywords: {
      google: deriveGoogleKeywords(result, fallback),
      pinterest: uniqueKeywords(result.keywords?.pinterest).slice(0, 4),
      tiktok: uniqueKeywords(result.keywords?.tiktok).slice(0, 4),
    },
  }
}

function normalizeSubreddit(name: string): string {
  return name.replace(/^r\//i, '').trim()
}

function deriveGoogleKeywords(result: ResearchPlan, fallback: ResearchPlan): string[] {
  const direct = uniqueKeywords(result.keywords?.google).slice(0, 4)
  if (direct.length > 0) return direct

  return uniqueKeywords([
    result.projectTitle?.trim() || fallback.projectTitle,
    ...(result.keywords?.pinterest ?? []),
    ...(result.keywords?.tiktok ?? []),
  ]).slice(0, 4)
}

function uniqueKeywords(items: string[] | undefined): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of items ?? []) {
    const kw = raw.trim()
    if (!kw) continue
    const key = kw.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(kw)
  }
  return out
}
