<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue'
import { useImageEditor } from '~/composables/useImageEditor'
import EditorCanvas from './EditorCanvas.vue'
import EditorToolbar from './EditorToolbar.vue'
import EditorSidebar, { type Variation } from './EditorSidebar.vue'

interface EditorVariant { id: string; label: string; url: string }

interface Props {
  open: boolean
  projectId: string
  imageId: string
  sourceUrl: string
  variationId?: string | null
  title?: string
  variants?: EditorVariant[]
}
const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'saved'): void
}>()

const editor = useImageEditor()
const currentVariationId = ref<string | null>(props.variationId ?? null)
const variations = ref<Variation[]>([])
const loadingVariations = ref(false)
const saving = ref(false)
const tracing = ref(false)
const loadError = ref<string | null>(null)
const currentVariantId = ref<string | null>(null)

watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    currentVariationId.value = props.variationId ?? null
    loadError.value = null
    currentVariantId.value = props.variants?.find((v) => v.url === props.sourceUrl)?.id ?? null
    try {
      await editor.loadSource(props.sourceUrl)
    } catch (e: any) {
      loadError.value = e?.message ?? 'Failed to load image'
    }
    await refreshVariations()
  }
}, { immediate: true })

async function switchVariant(v: EditorVariant) {
  if (currentVariantId.value === v.id) return
  currentVariantId.value = v.id
  // Switching to a base variant clears any saved-variation selection.
  currentVariationId.value = null
  loadError.value = null
  try {
    await editor.loadSource(v.url)
  } catch (e: any) {
    loadError.value = e?.message ?? 'Failed to load variant'
  }
}

function close() { emit('update:open', false) }

async function refreshVariations() {
  loadingVariations.value = true
  try {
    const res = await $fetch<{ variations: Variation[] }>(`/api/workflow/${props.projectId}/images/${props.imageId}/variations`)
    variations.value = res.variations ?? []
  } finally {
    loadingVariations.value = false
  }
}

function onPointer(action: 'wand' | 'brush' | 'eraser', x: number, y: number, isStart: boolean) {
  if (action === 'wand') editor.runWand(x, y)
  else if (action === 'brush') editor.paintAt(x, y, 'add')
  else if (action === 'eraser') editor.paintAt(x, y, 'erase')
}

function onPan(dx: number, dy: number) {
  editor.pan.value = { x: editor.pan.value.x + dx, y: editor.pan.value.y + dy }
}

function onZoom(next: number, anchorX: number, anchorY: number) {
  // Keep the pixel under (anchorX,anchorY) fixed in screen-space.
  const cur = editor.zoom.value
  const imgX = (anchorX - editor.pan.value.x) / cur
  const imgY = (anchorY - editor.pan.value.y) / cur
  editor.zoom.value = next
  editor.pan.value = { x: anchorX - imgX * next, y: anchorY - imgY * next }
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
  return btoa(binary)
}

async function saveNew(name: string, kind: string) {
  saving.value = true
  try {
    const blob = await editor.exportPng()
    const b64 = await blobToBase64(blob)
    const res = await $fetch<{ variation: Variation }>(
      `/api/workflow/${props.projectId}/images/${props.imageId}/variations`,
      { method: 'POST', body: { name, kind, format: 'png', blob: b64 } },
    )
    currentVariationId.value = res.variation.id
    await refreshVariations()
    emit('saved')
  } finally {
    saving.value = false
  }
}

async function overwrite() {
  if (!currentVariationId.value) return
  saving.value = true
  try {
    const blob = await editor.exportPng()
    const b64 = await blobToBase64(blob)
    await $fetch(
      `/api/workflow/${props.projectId}/images/${props.imageId}/variations/${currentVariationId.value}`,
      { method: 'PUT', body: { blob: b64, format: 'png' } },
    )
    await refreshVariations()
    emit('saved')
  } finally {
    saving.value = false
  }
}

async function rename(variationId: string, name: string) {
  await $fetch(
    `/api/workflow/${props.projectId}/images/${props.imageId}/variations/${variationId}`,
    { method: 'PATCH', body: { name } },
  )
  await refreshVariations()
}

async function deleteVariation(variationId: string) {
  if (!confirm('Delete this variation? This cannot be undone.')) return
  await $fetch(
    `/api/workflow/${props.projectId}/images/${props.imageId}/variations/${variationId}`,
    { method: 'DELETE' },
  )
  if (currentVariationId.value === variationId) currentVariationId.value = null
  await refreshVariations()
  emit('saved')
}

async function traceSvg(name: string) {
  tracing.value = true
  try {
    const res = await $fetch<{ variation: Variation }>(
      `/api/workflow/${props.projectId}/images/${props.imageId}/variations/trace`,
      { method: 'POST', body: { name, sourceVariationId: currentVariationId.value } },
    )
    currentVariationId.value = res.variation.id
    await refreshVariations()
    emit('saved')
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.message || 'Trace failed'
    alert(`SVG trace failed: ${msg}`)
  } finally {
    tracing.value = false
  }
}

async function useVariation(v: Variation) {
  currentVariationId.value = v.id
  try {
    await editor.loadSource(v.url)
  } catch (e: any) {
    loadError.value = e?.message ?? 'Failed to load variation'
  }
}

function onKey(e: KeyboardEvent) {
  if (!props.open) return
  if (e.key === 'Escape') close()
  else if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); editor.undo() }
  else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); editor.redo() }
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex flex-col bg-background">
      <header class="flex items-center justify-between gap-3 border-b px-4 py-2">
        <h2 class="text-sm font-semibold truncate">{{ title || 'Image editor' }}</h2>
        <div v-if="variants && variants.length > 1" class="flex shrink-0 items-center gap-1 rounded-md border bg-muted/40 p-0.5">
          <button
            v-for="v in variants"
            :key="v.id"
            type="button"
            class="rounded-sm px-2 py-1 text-xs transition-colors"
            :class="currentVariantId === v.id ? 'bg-background font-medium shadow-sm' : 'hover:bg-background/60 text-muted-foreground'"
            @click="switchVariant(v)"
          >{{ v.label }}</button>
        </div>
        <button type="button" class="shrink-0 rounded-md border px-3 py-1.5 text-sm hover:bg-muted" @click="close">Close (Esc)</button>
      </header>

      <div class="flex flex-1 overflow-hidden">
        <EditorToolbar
          :active-tool="editor.activeTool.value"
          :wand-tolerance="editor.wandTolerance.value"
          :brush-radius="editor.brushRadius.value"
          :can-undo="editor.canUndo.value"
          :can-redo="editor.canRedo.value"
          :has-mask="editor.hasMask.value"
          @update:active-tool="editor.activeTool.value = $event"
          @update:wand-tolerance="editor.wandTolerance.value = $event"
          @update:brush-radius="editor.brushRadius.value = $event"
          @undo="editor.undo()"
          @redo="editor.redo()"
          @apply="editor.applyMask()"
          @clear-mask="editor.clearMask()"
        />

        <main class="relative flex-1 overflow-hidden">
          <div v-if="editor.busy.value" class="absolute inset-0 z-10 flex items-center justify-center bg-background/60 text-sm text-muted-foreground">Loading…</div>
          <div v-if="loadError" class="absolute inset-0 z-10 flex items-center justify-center bg-background/80 p-4 text-sm text-destructive">{{ loadError }}</div>
          <div v-if="editor.sourceTainted.value && !loadError" class="absolute left-4 right-4 top-4 z-10 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
            Image loaded without cross-origin access — the storage bucket is missing CORS headers. You can view the image, but editing tools and saving are disabled.
          </div>
          <ClientOnly>
            <EditorCanvas
              v-if="editor.ready.value"
              :source-canvas="editor.sourceCanvas.value"
              :mask-canvas="editor.maskCanvas.value"
              :image-width="editor.width.value"
              :image-height="editor.height.value"
              :active-tool="editor.activeTool.value"
              :brush-radius="editor.brushRadius.value"
              :zoom="editor.zoom.value"
              :pan="editor.pan.value"
              @pointer="onPointer"
              @pan="onPan"
              @zoom="onZoom"
            />
          </ClientOnly>
        </main>

        <EditorSidebar
          :width="editor.width.value"
          :height="editor.height.value"
          :file-size="editor.fileSize.value"
          :mime-type="editor.mimeType.value"
          :variations="variations"
          :loading-variations="loadingVariations"
          :saving="saving"
          :tracing="tracing"
          :current-variation-id="currentVariationId"
          @save-new="saveNew"
          @overwrite="overwrite"
          @rename="rename"
          @delete="deleteVariation"
          @use-variation="useVariation"
          @trace-svg="traceSvg"
        />
      </div>
    </div>
  </Teleport>
</template>
