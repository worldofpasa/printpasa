<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"

const props = defineProps<{
  modelValue?: number
  class?: HTMLAttributes["class"]
  indicatorClass?: HTMLAttributes["class"]
}>()

const percent = computed(() => {
  const value = Number(props.modelValue ?? 0)
  return Math.min(100, Math.max(0, value))
})
</script>

<template>
  <div :class="cn('relative h-2.5 w-full overflow-hidden rounded-full bg-slate-950/10', props.class)">
    <div
      :class="cn('h-full rounded-full bg-[linear-gradient(90deg,#1f3147_0%,#365470_56%,#c58c3f_100%)] transition-[width] duration-300 ease-out', props.indicatorClass)"
      :style="{ width: `${percent}%` }"
    />
  </div>
</template>
