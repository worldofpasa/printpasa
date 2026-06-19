<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import type { EditorTool } from '~/composables/useImageEditor'

interface Props {
  sourceCanvas: HTMLCanvasElement | null
  maskCanvas: HTMLCanvasElement | null
  imageWidth: number
  imageHeight: number
  activeTool: EditorTool
  brushRadius: number
  zoom: number
  pan: { x: number; y: number }
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'pointer', action: 'wand' | 'brush' | 'eraser', x: number, y: number, isStart: boolean): void
  (e: 'pan', dx: number, dy: number): void
  (e: 'zoom', newZoom: number, anchorX: number, anchorY: number): void
}>()

const container = ref<HTMLDivElement | null>(null)
const containerSize = ref({ w: 0, h: 0 })
const cursorPos = ref<{ x: number; y: number } | null>(null)
const isPanning = ref(false)
const isPainting = ref(false)
let resizeObs: ResizeObserver | null = null

onMounted(() => {
  if (!container.value) return
  resizeObs = new ResizeObserver(() => {
    if (!container.value) return
    const r = container.value.getBoundingClientRect()
    containerSize.value = { w: r.width, h: r.height }
  })
  resizeObs.observe(container.value)
  nextTick(() => {
    if (!container.value) return
    const r = container.value.getBoundingClientRect()
    containerSize.value = { w: r.width, h: r.height }
  })
})

onBeforeUnmount(() => {
  resizeObs?.disconnect()
})

// Fit image to container on load / size change.
watch([() => props.imageWidth, () => props.imageHeight, containerSize], () => {
  if (!props.imageWidth || !containerSize.value.w) return
  // nothing to auto-fit here — parent composable owns zoom/pan. This is just for the brush cursor sanity.
}, { immediate: true })

const stageScale = computed(() => props.zoom)
const stagePos = computed(() => props.pan)

function toImageCoords(evt: PointerEvent): { x: number; y: number } | null {
  if (!container.value) return null
  const r = container.value.getBoundingClientRect()
  const sx = evt.clientX - r.left
  const sy = evt.clientY - r.top
  const ix = (sx - props.pan.x) / props.zoom
  const iy = (sy - props.pan.y) / props.zoom
  if (ix < 0 || iy < 0 || ix >= props.imageWidth || iy >= props.imageHeight) return null
  return { x: ix, y: iy }
}

function onPointerDown(evt: PointerEvent) {
  if (!container.value) return
  ;(evt.target as Element).setPointerCapture?.(evt.pointerId)

  if (props.activeTool === 'pan' || evt.button === 1 || evt.shiftKey) {
    isPanning.value = true
    return
  }

  const pt = toImageCoords(evt)
  if (!pt) return

  if (props.activeTool === 'wand') {
    emit('pointer', 'wand', pt.x, pt.y, true)
  } else if (props.activeTool === 'brush') {
    isPainting.value = true
    emit('pointer', 'brush', pt.x, pt.y, true)
  } else if (props.activeTool === 'eraser') {
    isPainting.value = true
    emit('pointer', 'eraser', pt.x, pt.y, true)
  }
}

function onPointerMove(evt: PointerEvent) {
  if (!container.value) return
  const r = container.value.getBoundingClientRect()
  cursorPos.value = { x: evt.clientX - r.left, y: evt.clientY - r.top }

  if (isPanning.value) {
    emit('pan', evt.movementX, evt.movementY)
    return
  }

  if (!isPainting.value) return
  const pt = toImageCoords(evt)
  if (!pt) return

  if (props.activeTool === 'brush') emit('pointer', 'brush', pt.x, pt.y, false)
  else if (props.activeTool === 'eraser') emit('pointer', 'eraser', pt.x, pt.y, false)
}

function onPointerUp(evt: PointerEvent) {
  ;(evt.target as Element).releasePointerCapture?.(evt.pointerId)
  isPanning.value = false
  isPainting.value = false
}

function onPointerLeave() {
  cursorPos.value = null
}

function onWheel(evt: WheelEvent) {
  if (!container.value) return
  evt.preventDefault()
  const r = container.value.getBoundingClientRect()
  const anchorX = evt.clientX - r.left
  const anchorY = evt.clientY - r.top
  const factor = evt.deltaY < 0 ? 1.1 : 1 / 1.1
  const next = Math.min(16, Math.max(0.1, props.zoom * factor))
  emit('zoom', next, anchorX, anchorY)
}

const cursorClass = computed(() => {
  if (isPanning.value) return 'cursor-grabbing'
  if (props.activeTool === 'pan') return 'cursor-grab'
  if (props.activeTool === 'wand') return 'cursor-crosshair'
  return 'cursor-none'
})
</script>

<template>
  <div
    ref="container"
    class="relative h-full w-full select-none overflow-hidden bg-[conic-gradient(at_50%_50%,#e5e7eb_0.25turn,#f3f4f6_0_0.5turn,#e5e7eb_0_0.75turn,#f3f4f6_0)] bg-[length:24px_24px]"
    :class="cursorClass"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @pointerleave="onPointerLeave"
    @wheel.passive.prevent="onWheel"
  >
    <v-stage
      :config="{ width: containerSize.w, height: containerSize.h, scaleX: stageScale, scaleY: stageScale, x: stagePos.x, y: stagePos.y, listening: false }"
    >
      <v-layer>
        <v-image v-if="sourceCanvas" :config="{ image: sourceCanvas, x: 0, y: 0 }" />
      </v-layer>
      <v-layer>
        <v-image v-if="maskCanvas" :config="{ image: maskCanvas, x: 0, y: 0, listening: false }" />
      </v-layer>
    </v-stage>

    <!-- Brush cursor ring (HTML overlay, not a Konva shape — simpler + crisper) -->
    <div
      v-if="cursorPos && (activeTool === 'brush' || activeTool === 'eraser')"
      class="pointer-events-none absolute rounded-full border-2"
      :class="activeTool === 'brush' ? 'border-blue-500' : 'border-orange-500'"
      :style="{
        left: (cursorPos.x - brushRadius * zoom) + 'px',
        top: (cursorPos.y - brushRadius * zoom) + 'px',
        width: (brushRadius * 2 * zoom) + 'px',
        height: (brushRadius * 2 * zoom) + 'px',
      }"
    />
  </div>
</template>
