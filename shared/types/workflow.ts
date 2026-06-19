export const WORKFLOW_STAGES = [
  'gather-idea',
  'idea-validator',
  'image-prompts',
  'image-generate',
  'image-optimization',
  'product-placement',
  'manual-review',
] as const

export type WorkflowStage = typeof WORKFLOW_STAGES[number]

export const STAGE_INDEX: Record<WorkflowStage, number> = {
  'gather-idea': 0,
  'idea-validator': 1,
  'image-prompts': 2,
  'image-generate': 3,
  'image-optimization': 4,
  'product-placement': 5,
  'manual-review': 6,
}

export const STAGE_LABELS: Record<WorkflowStage, string> = {
  'gather-idea': 'Gather Idea',
  'idea-validator': 'Idea Validator',
  'image-prompts': 'Image Prompts',
  'image-generate': 'Image Generate',
  'image-optimization': 'Image Optimization',
  'product-placement': 'Product Placement',
  'manual-review': 'Manual Review',
}

export const STAGE_DESCRIPTIONS: Record<WorkflowStage, string> = {
  'gather-idea': 'Choose trends and niches to generate t-shirt design themes',
  'idea-validator': 'Validate ideas for commercial viability and IP safety',
  'image-prompts': 'Generate detailed prompts for AI image generation',
  'image-generate': 'Create high-quality print-ready images from prompts',
  'image-optimization': 'Remove background and upscale generated images',
  'product-placement': 'Place designs on products via Printify',
  'manual-review': 'Review, finalize, and publish products',
}

export interface StageTransition {
  from: WorkflowStage
  to: WorkflowStage
  canTransition: boolean
  reason?: string
}
