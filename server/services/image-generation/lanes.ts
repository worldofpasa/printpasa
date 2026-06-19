export const DESIGN_LANES = ['graphic', 'hybrid'] as const
export type DesignLane = typeof DESIGN_LANES[number]

export const FAL_MODEL_GRAPHIC = 'fal-ai/flux/dev'
export const FAL_MODEL_HYBRID = 'fal-ai/ideogram/v3'

export function modelForDesignLane(lane: string | null | undefined): string {
  return lane === 'hybrid' ? FAL_MODEL_HYBRID : FAL_MODEL_GRAPHIC
}

export function splitPromptCounts(total: number): { hybridCount: number; graphicCount: number } {
  if (total <= 1) return { hybridCount: 1, graphicCount: 0 }
  const hybridCount = Math.max(1, Math.round(total * 0.6))
  const graphicCount = total - hybridCount
  if (graphicCount < 1) return { hybridCount: total - 1, graphicCount: 1 }
  return { hybridCount, graphicCount }
}

export function resolveGenerationModel(
  prompt: { recommendedModel?: string | null; designLane?: string | null },
  options: { overrideModel?: string; batchModel?: string },
): string {
  return (
    options.overrideModel
    ?? prompt.recommendedModel
    ?? options.batchModel
    ?? modelForDesignLane(prompt.designLane)
  )
}
