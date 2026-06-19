import { WORKFLOW_STAGES, STAGE_INDEX, type WorkflowStage, type StageTransition } from '~~/shared/types/workflow'

export function useWorkflow(
  projectId: Ref<string>,
  projectSlug: Ref<string>,
  projectMaxStage?: Ref<WorkflowStage | undefined>,
  projectStatus?: Ref<string | undefined>
) {
  const currentStage = ref<WorkflowStage>('gather-idea')
  const isTransitioning = ref(false)
  const transitionError = ref<string | null>(null)

  function getNextStage(current: WorkflowStage): WorkflowStage | null {
    const idx = STAGE_INDEX[current]
    return idx < WORKFLOW_STAGES.length - 1 ? (WORKFLOW_STAGES[idx + 1] ?? null) : null
  }

  function getPrevStage(current: WorkflowStage): WorkflowStage | null {
    const idx = STAGE_INDEX[current]
    return idx > 0 ? (WORKFLOW_STAGES[idx - 1] ?? null) : null
  }

  function getStageProgress(): number {
    return ((STAGE_INDEX[currentStage.value] + 1) / WORKFLOW_STAGES.length) * 100
  }

  function isStageCompleted(stage: WorkflowStage): boolean {
    if (projectStatus?.value === 'completed') return true
    const limit = projectMaxStage?.value ? STAGE_INDEX[projectMaxStage.value] : STAGE_INDEX[currentStage.value]
    return STAGE_INDEX[stage] < limit
  }

  function isStageActive(stage: WorkflowStage): boolean {
    return stage === currentStage.value
  }

  function isStageAccessible(stage: WorkflowStage): boolean {
    if (projectStatus?.value === 'completed') return true
    const limit = projectMaxStage?.value ? STAGE_INDEX[projectMaxStage.value] : STAGE_INDEX[currentStage.value]
    return STAGE_INDEX[stage] <= limit
  }

  async function canAdvance(): Promise<StageTransition> {
    const next = getNextStage(currentStage.value)
    if (!next) {
      return { from: currentStage.value, to: currentStage.value, canTransition: false, reason: 'Already at final stage' }
    }

    try {
      // Workflow API uses internal project ID
      const data = await $fetch(`/api/workflow/${projectId.value}/stage`)
      const stage = currentStage.value

      const checks: Record<WorkflowStage, () => { ok: boolean; reason: string }> = {
        'gather-idea': () => ({
          ok: (data as any).selectedThemeCount > 0,
          reason: 'Select at least one generated theme',
        }),
        'idea-validator': () => ({
          ok: (data as any).winnerCount > 0,
          reason: 'Select at least one validated winner',
        }),
        'image-prompts': () => ({
          ok: (data as any).selectedPromptCount > 0,
          reason: 'Need at least one image prompt',
        }),
        'image-generate': () => ({
          ok: (data as any).selectedImageCount > 0,
          reason: 'Select at least one generated image',
        }),
        'image-optimization': () => ({ ok: true, reason: '' }), // Pass-through
        'product-placement': () => ({
          ok: (data as any).createdProductCount > 0,
          reason: 'Create at least one product',
        }),
        'manual-review': () => ({ ok: true, reason: '' }),
      }

      const check = checks[stage]()
      return {
        from: stage,
        to: next,
        canTransition: check.ok,
        reason: check.ok ? undefined : check.reason,
      }
    } catch {
      return { from: currentStage.value, to: next, canTransition: false, reason: 'Failed to check stage status' }
    }
  }

  async function advance(): Promise<boolean> {
    const transition = await canAdvance()
    if (!transition.canTransition) {
      transitionError.value = transition.reason ?? 'Cannot advance'
      return false
    }

    isTransitioning.value = true
    transitionError.value = null

    try {
      // Workflow API uses internal project ID
      await $fetch(`/api/workflow/${projectId.value}/stage`, {
        method: 'PUT',
        body: { stage: transition.to },
      })
      currentStage.value = transition.to
      // Navigation uses slug
      navigateTo(`/projects/${projectSlug.value}/stage/${transition.to}`)
      return true
    } catch (err: any) {
      transitionError.value = err.data?.message ?? 'Failed to advance stage'
      return false
    } finally {
      isTransitioning.value = false
    }
  }

  function goBack(): void {
    const prev = getPrevStage(currentStage.value)
    if (prev) {
      currentStage.value = prev
      // Navigation uses slug
      navigateTo(`/projects/${projectSlug.value}/stage/${prev}`)
    }
  }

  function goToStage(stage: WorkflowStage): void {
    if (isStageAccessible(stage)) {
      currentStage.value = stage
      // Navigation uses slug
      navigateTo(`/projects/${projectSlug.value}/stage/${stage}`)
    }
  }

  return {
    currentStage,
    isTransitioning,
    transitionError,
    getNextStage,
    getPrevStage,
    getStageProgress,
    isStageCompleted,
    isStageActive,
    isStageAccessible,
    canAdvance,
    advance,
    goBack,
    goToStage,
  }
}
