/** Text LLM workflow stages (stages 1–3 + stage 5 metadata). */
export const TEXT_WORKFLOW_STAGES = [
  'gather-idea',
  'validate',
  'image-prompts',
  'product-metadata',
  'niche-classify',
] as const

export type TextWorkflowStage = typeof TEXT_WORKFLOW_STAGES[number]

export const TEXT_STAGE_LABELS: Record<TextWorkflowStage, string> = {
  'gather-idea': 'Stage 1 — Gather idea & research',
  'validate': 'Stage 2 — Idea validation',
  'image-prompts': 'Stage 3 — Image prompts',
  'product-metadata': 'Stage 5 — Product metadata',
  'niche-classify': 'Discovery — Niche Classification',
}

export type StageTextConfig = Partial<Record<TextWorkflowStage, {
  provider?: string
  model?: string
}>>

/** Sentinel for Select — Radix/reka-ui rejects empty string item values. */
export const STAGE_TEXT_GLOBAL_DEFAULT = '__global__'
