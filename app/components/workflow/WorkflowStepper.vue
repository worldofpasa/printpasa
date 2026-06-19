<script setup lang="ts">
import Badge from '~/components/ui/badge/Badge.vue'
import { WORKFLOW_STAGES, STAGE_LABELS, STAGE_DESCRIPTIONS, STAGE_INDEX, type WorkflowStage } from '~~/shared/types/workflow'

const props = defineProps<{
  currentStage: WorkflowStage
  projectId: string
  projectMaxStage?: WorkflowStage
  projectStatus?: string
}>()

const emit = defineEmits<{
  'navigate': [stage: WorkflowStage]
}>()

function isCompleted(stage: WorkflowStage): boolean {
  if (props.projectStatus === 'completed') return true
  const maxIdx = props.projectMaxStage ? STAGE_INDEX[props.projectMaxStage] : STAGE_INDEX[props.currentStage]
  return STAGE_INDEX[stage] < maxIdx
}

function isActive(stage: WorkflowStage): boolean {
  return stage === props.currentStage
}

function isAccessible(stage: WorkflowStage): boolean {
  if (props.projectStatus === 'completed') return true
  const maxIdx = props.projectMaxStage ? STAGE_INDEX[props.projectMaxStage] : STAGE_INDEX[props.currentStage]
  return STAGE_INDEX[stage] <= maxIdx
}

function handleClick(stage: WorkflowStage) {
  if (isAccessible(stage)) {
    emit('navigate', stage)
  }
}

function stageStatus(stage: WorkflowStage): string {
  if (isActive(stage)) return 'Current stage'
  if (isCompleted(stage)) return 'Completed'
  if (isAccessible(stage)) return 'Available'
  return 'Locked'
}

function badgeVariant(stage: WorkflowStage): 'accent' | 'success' | 'muted' {
  if (isActive(stage)) return 'accent'
  if (isCompleted(stage)) return 'success'
  return 'muted'
}
</script>

<template>
  <nav class="space-y-4">
    <div class="flex gap-3 overflow-x-auto pb-1 lg:hidden">
      <button
        v-for="stage in WORKFLOW_STAGES"
        :key="stage"
        class="shrink-0 rounded-[1.35rem] border px-4 py-3 text-left transition-all duration-200"
        :class="{
          'border-slate-950 bg-slate-950 text-white shadow-soft': isActive(stage),
          'border-emerald-200 bg-emerald-50 text-emerald-900': isCompleted(stage),
          'border-black/10 bg-white text-slate-700 hover:border-slate-950/20 hover:bg-slate-50': !isActive(stage) && !isCompleted(stage) && isAccessible(stage),
          'border-black/5 bg-slate-100/70 text-slate-400': !isAccessible(stage),
        }"
        :disabled="!isAccessible(stage)"
        @click="handleClick(stage)"
      >
        <div class="flex items-start gap-3">
          <span
            class="mt-0.5 flex h-8 w-8 items-center justify-center rounded-2xl border text-xs font-bold"
            :class="{
              'border-white/20 bg-white/10': isActive(stage),
              'border-emerald-200 bg-emerald-100 text-emerald-700': isCompleted(stage),
              'border-black/10 bg-slate-50 text-slate-500': !isActive(stage) && !isCompleted(stage),
            }"
          >
            <svg v-if="isCompleted(stage)" class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>
            <span v-else>{{ STAGE_INDEX[stage] + 1 }}</span>
          </span>
          <div class="min-w-0 space-y-2">
            <p class="text-sm font-semibold whitespace-nowrap">{{ STAGE_LABELS[stage] }}</p>
            <Badge :variant="badgeVariant(stage)" :class="isActive(stage) ? 'border-white/10 bg-white/10 text-slate-100' : ''">
              {{ stageStatus(stage) }}
            </Badge>
          </div>
        </div>
      </button>
    </div>

    <ol class="hidden space-y-3 lg:block">
      <li
        v-for="stage in WORKFLOW_STAGES"
        :key="stage"
        class="relative"
      >
        <div
          v-if="STAGE_INDEX[stage] < WORKFLOW_STAGES.length - 1"
          class="absolute left-5 top-12 h-[calc(100%-0.4rem)] w-px"
          :class="isCompleted(stage) ? 'bg-emerald-300' : 'bg-black/10'"
        />

        <button
          class="relative flex w-full items-start gap-4 rounded-[1.5rem] border px-4 py-4 text-left transition-all duration-200"
          :class="{
            'border-slate-950 bg-slate-950 text-white shadow-panel': isActive(stage),
            'border-emerald-200 bg-emerald-50 text-emerald-950': isCompleted(stage),
            'border-black/10 bg-white text-slate-800 hover:border-slate-950/20 hover:bg-slate-50': !isActive(stage) && !isCompleted(stage) && isAccessible(stage),
            'border-black/5 bg-slate-100/60 text-slate-400': !isAccessible(stage),
          }"
          :disabled="!isAccessible(stage)"
          @click="handleClick(stage)"
        >
          <span
            class="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-sm font-bold"
            :class="{
              'border-white/20 bg-white/10': isActive(stage),
              'border-emerald-200 bg-emerald-100 text-emerald-700': isCompleted(stage),
              'border-black/10 bg-slate-50 text-slate-500': !isActive(stage) && !isCompleted(stage),
            }"
          >
            <svg v-if="isCompleted(stage)" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>
            <span v-else>{{ STAGE_INDEX[stage] + 1 }}</span>
          </span>

          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <p class="font-semibold">{{ STAGE_LABELS[stage] }}</p>
              <Badge
                :variant="badgeVariant(stage)"
                :class="isActive(stage) ? 'border-white/10 bg-white/10 text-slate-100' : ''"
              >
                {{ stageStatus(stage) }}
              </Badge>
            </div>
            <p class="mt-1 text-sm leading-6" :class="isActive(stage) ? 'text-slate-200' : 'text-slate-500'">
              {{ STAGE_DESCRIPTIONS[stage] }}
            </p>
          </div>
        </button>
      </li>
    </ol>
  </nav>
</template>
