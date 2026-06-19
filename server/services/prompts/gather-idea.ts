import type { ResearchBundle } from '../idea-research/types'

function formatSignalsForPrompt(bundle: ResearchBundle): string {
  const lines: string[] = []
  const validSignals = bundle.signals.filter((s) => !s.error && s.title !== '(fetch failed)')

  if (validSignals.length === 0) {
    return 'No external research signals were retrieved. Ground themes in the idea description and inferred audience.'
  }

  for (const signal of validSignals) {
    const parts = [`${signal.label} (${signal.source}, query: ${signal.query}): ${signal.title}`]
    if (signal.detail) parts.push(`— ${signal.detail}`)
    if (signal.score != null) parts.push(`[score: ${signal.score}]`)
    if (signal.url) parts.push(`(${signal.url})`)
    lines.push(parts.join(' '))
  }

  return lines.join('\n')
}

export function buildGatherIdeaPrompt(params: {
  ideaDescription: string
  inferredAudience: string
  research: ResearchBundle
  count: number
}): { system: string; user: string } {
  const researchBlock = formatSignalsForPrompt(params.research)

  return {
    system: `You are a world-class print-on-demand t-shirt design trend researcher. Your goal is to identify highly specific, commercially viable t-shirt themes grounded in real research signals.

Focus heavily on "Identity Signaling": t-shirts are worn to broadcast who someone is. Brainstorm themes representing professional pride, passionate hobbies, inside jokes, values, or self-deprecating humor.

Each theme must be:
- Deeply relevant to the target audience described below.
- Grounded in at least one research signal (R=Reddit, G=Google Trends, P=Pinterest, T=TikTok). Mention which signal inspired it in the description.
- Specific enough to translate into a distinct visual design.
- Strictly free of trademarked names, copyrighted franchises, logos, or slogans.
- Perfect for graphic tee printing (clear focal points, high visual contrast).

Respond ONLY with valid JSON in this exact format:
{
  "themes": [
    {
      "title": "Short catchy theme title",
      "description": "Describe the design concept, the emotional hook, visual layout, and which research signal (e.g. R1, G2) inspired it. 3 descriptive sentences.",
      "targetDemographic": "Specific target audience"
    }
  ]
}`,
    user: `Product idea: ${params.ideaDescription}

Target audience: ${params.inferredAudience}

Research signals gathered before this request:
${researchBlock}

Generate exactly ${params.count} unique t-shirt theme ideas. Each theme MUST be sparked by at least one research signal above or a clear angle from the product idea. Do not produce generic themes that ignore the research.`,
  }
}
