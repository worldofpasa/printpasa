import type { WorkflowRunPhase, WorkflowRunLevel } from '../workflow-run-audit'
import type { WorkflowStage } from '~~/shared/types/workflow'

const PIPELINE_STEP_TO_STAGE: Record<string, WorkflowStage> = {
  create_project: 'gather-idea',
  fetch_trends: 'gather-idea',
  gather_idea: 'gather-idea',
  select_themes: 'gather-idea',
  stage_validator: 'idea-validator',
  validate: 'idea-validator',
  select_winners: 'idea-validator',
  stage_prompts: 'image-prompts',
  prompts: 'image-prompts',
  stage_images: 'image-generate',
  images_generate: 'image-generate',
  select_images: 'image-generate',
  stage_handoff: 'product-placement',
  complete: 'manual-review',
}

const WORKFLOW_SOURCE_TO_ACTOR: Record<string, string> = {
  ui: 'USER',
  cron: 'CRON',
  telegram: 'TELEGRAM',
}

const WORKFLOW_PHASE_TO_STAGE: Partial<Record<WorkflowRunPhase, WorkflowStage>> = {
  discovery: 'gather-idea',
  research: 'gather-idea',
  themes: 'gather-idea',
  pipeline: 'gather-idea',
}

export function mapPipelineStepToStage(step: string): WorkflowStage | null {
  return PIPELINE_STEP_TO_STAGE[step] ?? null
}

export function mapWorkflowSourceToActor(source: string): string {
  return WORKFLOW_SOURCE_TO_ACTOR[source] ?? 'SYSTEM'
}

export function mapWorkflowPhaseToStage(phase: WorkflowRunPhase): WorkflowStage | null {
  return WORKFLOW_PHASE_TO_STAGE[phase] ?? null
}

export function mapWorkflowPhaseToAction(
  phase: WorkflowRunPhase,
  level: WorkflowRunLevel,
  message: string,
): string {
  const normalized = message.toLowerCase()
  if (phase === 'research') {
    if (level === 'error') return 'workflow.research.failed'
    if (level === 'warning') return 'workflow.research.warning'
    return 'workflow.research.completed'
  }
  if (phase === 'themes') {
    if (level === 'error') return 'workflow.themes.failed'
    return 'workflow.themes.created'
  }
  if (phase === 'discovery') {
    return 'workflow.discovery.completed'
  }
  if (phase === 'pipeline') {
    if (normalized.includes('enqueued')) return 'workflow.pipeline.job_enqueued'
    return 'workflow.pipeline.info'
  }
  return `workflow.${phase}.${level}`
}

export function mapPipelineStepToAction(step: string, level: string): string {
  return `pipeline.${step}.${level}`
}
