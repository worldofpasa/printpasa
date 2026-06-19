import type { IAIProvider } from '../text-generation/types'
import { fallbackResearchPlan, planIdeaResearch } from './plan'
import { fetchRedditSignals } from './fetch-reddit'
import { fetchGoogleTrendSignals } from './fetch-google-keywords'
import { fetchPinterestSignals } from './fetch-pinterest'
import { fetchTikTokSignals } from './fetch-tiktok'
import { resolveSearchCredentials, type SearchCredentials } from './search-provider'
import { buildAllSourceStatuses } from './source-status'
import type { LabeledSignal, ResearchBundle } from './types'

async function fetchWithStatus(
  source: LabeledSignal['source'],
  fn: () => Promise<LabeledSignal[]>,
): Promise<LabeledSignal[]> {
  try {
    return await fn()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(`[idea-research] ${source} fetch failed:`, message)
    return [{
      label: `${source}-err`,
      source,
      query: '(task)',
      title: '(fetch failed)',
      error: message,
    }]
  }
}

export async function runIdeaResearch(
  ideaDescription: string,
  ai: IAIProvider,
  userId?: string,
): Promise<ResearchBundle> {
  const warnings: string[] = []
  let plan = fallbackResearchPlan(ideaDescription)

  try {
    plan = await planIdeaResearch(ideaDescription, ai)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    warnings.push(`Research plan LLM failed: ${message}. Using fallback title and continuing without planned queries.`)
    console.warn('[idea-research]', warnings[warnings.length - 1])
  }

  let searchCreds: SearchCredentials | null = await resolveSearchCredentials(userId)

  if (searchCreds?.misconfigured) {
    warnings.push(
      'Your key works with SearchAPI.io but is set as NUXT_SERPAPI_KEY — move it to NUXT_SEARCHAPI_KEY when convenient.',
    )
  }

  if (!searchCreds) {
    warnings.push(
      'No valid search API key — Google Trends keywords, Pinterest, TikTok, and Reddit search fallback skipped. Set a key for Serper.dev, SearchAPI.io, or SerpAPI in Settings or .env.',
    )
    console.warn('[idea-research] No valid search provider key')
  }

  const fetchTasks: Array<{ source: LabeledSignal['source']; run: () => Promise<LabeledSignal[]> }> = []

  if (plan.subreddits.length > 0) {
    fetchTasks.push({
      source: 'reddit',
      run: () => fetchRedditSignals(plan.subreddits, { search: searchCreds }),
    })
  }

  if (searchCreds) {
    if (plan.keywords.google.length > 0) {
      fetchTasks.push({
        source: 'google-trends',
        run: () => fetchGoogleTrendSignals(searchCreds!, plan.keywords.google),
      })
    }
    if (plan.keywords.pinterest.length > 0) {
      fetchTasks.push({
        source: 'pinterest',
        run: () => fetchPinterestSignals(searchCreds!, plan.keywords.pinterest),
      })
    }
    if (plan.keywords.tiktok.length > 0) {
      fetchTasks.push({
        source: 'tiktok',
        run: () => fetchTikTokSignals(searchCreds!, plan.keywords.tiktok),
      })
    }
  }

  const results = await Promise.allSettled(
    fetchTasks.map((task) => fetchWithStatus(task.source, task.run)),
  )

  const signals: LabeledSignal[] = []
  for (const result of results) {
    if (result.status === 'fulfilled') {
      signals.push(...result.value)
    } else {
      const message = result.reason instanceof Error ? result.reason.message : String(result.reason)
      warnings.push(`Research fetch failed: ${message}`)
      console.warn('[idea-research] fetch task rejected:', message)
    }
  }

  const sourceStatuses = buildAllSourceStatuses(plan, signals, !!searchCreds)

  for (const status of sourceStatuses) {
    if (status.status === 'failed') {
      warnings.push(`${status.displayName} failed: ${status.message ?? 'unknown error'}`)
    }
  }

  return {
    ideaDescription,
    plan,
    signals,
    sourceStatuses,
    warnings,
    fetchedAt: new Date().toISOString(),
  }
}

export function emptyResearchBundle(ideaDescription: string, warning: string): ResearchBundle {
  const plan = fallbackResearchPlan(ideaDescription)
  return {
    ideaDescription,
    plan,
    signals: [],
    sourceStatuses: buildAllSourceStatuses(plan, [], false),
    warnings: [warning],
    fetchedAt: new Date().toISOString(),
  }
}
