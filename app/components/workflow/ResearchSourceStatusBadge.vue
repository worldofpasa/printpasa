<script setup lang="ts">
import { Check, Minus, TriangleAlert, X } from 'lucide-vue-next'

export type ResearchSourceFetchStatus = 'success' | 'partial' | 'failed' | 'skipped'

const props = defineProps<{
  status: ResearchSourceFetchStatus
  label?: string
  detail?: string
  compact?: boolean
  iconOnly?: boolean
}>()

const statusLabels: Record<ResearchSourceFetchStatus, string> = {
  success: 'Success',
  partial: 'Partial',
  failed: 'Failed',
  skipped: 'Skipped',
}

const chipClass: Record<ResearchSourceFetchStatus, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  partial: 'border-amber-200 bg-amber-50 text-amber-900',
  failed: 'border-rose-200 bg-rose-50 text-rose-800',
  skipped: 'border-black/10 bg-slate-50 text-slate-600',
}

const iconClass: Record<ResearchSourceFetchStatus, string> = {
  success: 'text-emerald-600',
  partial: 'text-amber-600',
  failed: 'text-rose-600',
  skipped: 'text-slate-400',
}
</script>

<template>
  <Check
    v-if="iconOnly && status === 'success'"
    class="h-3.5 w-3.5 shrink-0"
    :class="iconClass[status]"
    aria-hidden="true"
  />
  <TriangleAlert
    v-else-if="iconOnly && status === 'partial'"
    class="h-3.5 w-3.5 shrink-0"
    :class="iconClass[status]"
    aria-hidden="true"
  />
  <X
    v-else-if="iconOnly && status === 'failed'"
    class="h-3.5 w-3.5 shrink-0"
    :class="iconClass[status]"
    aria-hidden="true"
  />
  <Minus
    v-else-if="iconOnly"
    class="h-3.5 w-3.5 shrink-0"
    :class="iconClass[status]"
    aria-hidden="true"
  />
  <span
    v-else
    class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium"
    :class="chipClass[status]"
  >
    <Check v-if="status === 'success'" class="h-3.5 w-3.5 shrink-0" :class="iconClass[status]" aria-hidden="true" />
    <TriangleAlert v-else-if="status === 'partial'" class="h-3.5 w-3.5 shrink-0" :class="iconClass[status]" aria-hidden="true" />
    <X v-else-if="status === 'failed'" class="h-3.5 w-3.5 shrink-0" :class="iconClass[status]" aria-hidden="true" />
    <Minus v-else class="h-3.5 w-3.5 shrink-0" :class="iconClass[status]" aria-hidden="true" />

    <span v-if="label">{{ label }}</span>
    <span v-if="!compact" class="text-[0.65rem] font-semibold uppercase tracking-[0.14em] opacity-80">
      {{ statusLabels[status] }}
    </span>
    <span v-if="detail" class="font-normal opacity-90">· {{ detail }}</span>
  </span>
</template>
