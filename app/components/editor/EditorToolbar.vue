<script setup lang="ts">
import type { EditorTool } from '~/composables/useImageEditor'

interface Props {
  activeTool: EditorTool
  wandTolerance: number
  brushRadius: number
  canUndo: boolean
  canRedo: boolean
  hasMask: boolean
}
const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:activeTool', t: EditorTool): void
  (e: 'update:wandTolerance', n: number): void
  (e: 'update:brushRadius', n: number): void
  (e: 'undo' | 'redo' | 'apply' | 'clearMask'): void
}>()

const tools: { id: EditorTool; label: string; icon: string }[] = [
  { id: 'pan',    label: 'Pan',     icon: '✋' },
  { id: 'wand',   label: 'Wand',    icon: '🪄' },
  { id: 'brush',  label: 'Brush',   icon: '🖌' },
  { id: 'eraser', label: 'Eraser',  icon: '🧽' },
]
</script>

<template>
  <div class="flex w-56 shrink-0 flex-col gap-4 border-r bg-background p-3">
    <div class="flex flex-col gap-1.5">
      <button
        v-for="t in tools"
        :key="t.id"
        type="button"
        class="flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-all active:scale-95"
        :class="activeTool === t.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'"
        @click="emit('update:activeTool', t.id)"
      >
        <span class="text-base leading-none">{{ t.icon }}</span>
        <span>{{ t.label }}</span>
      </button>
    </div>

    <div v-if="activeTool === 'wand'" class="space-y-2 rounded-md border p-2 text-xs">
      <label class="font-medium">Tolerance: {{ wandTolerance }}</label>
      <input
        type="range" min="0" max="100" :value="wandTolerance"
        class="w-full"
        @input="emit('update:wandTolerance', Number(($event.target as HTMLInputElement).value))"
      />
      <p class="text-muted-foreground">Higher tolerance picks a wider color range.</p>
    </div>

    <div v-if="activeTool === 'brush' || activeTool === 'eraser'" class="space-y-2 rounded-md border p-2 text-xs">
      <label class="font-medium">Radius: {{ brushRadius }}px</label>
      <input
        type="range" min="2" max="200" :value="brushRadius"
        class="w-full"
        @input="emit('update:brushRadius', Number(($event.target as HTMLInputElement).value))"
      />
    </div>

    <div class="mt-auto space-y-2">
      <button
        type="button"
        class="w-full rounded-md bg-destructive px-3 py-2 text-sm text-destructive-foreground transition-all hover:bg-destructive/90 active:scale-95 disabled:opacity-50"
        :disabled="!hasMask"
        @click="emit('apply')"
      >
        Apply mask
      </button>
      <button
        type="button"
        class="w-full rounded-md border px-3 py-2 text-sm transition-all hover:bg-muted active:scale-95 disabled:opacity-50"
        :disabled="!hasMask"
        @click="emit('clearMask')"
      >
        Clear mask
      </button>
      <div class="flex gap-2">
        <button
          type="button"
          class="flex-1 rounded-md border px-3 py-2 text-sm transition-all hover:bg-muted active:scale-95 disabled:opacity-50"
          :disabled="!canUndo"
          @click="emit('undo')"
        >↶ Undo</button>
        <button
          type="button"
          class="flex-1 rounded-md border px-3 py-2 text-sm transition-all hover:bg-muted active:scale-95 disabled:opacity-50"
          :disabled="!canRedo"
          @click="emit('redo')"
        >↷ Redo</button>
      </div>
    </div>
  </div>
</template>
