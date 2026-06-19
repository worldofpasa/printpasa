<script setup lang="ts">
import { ref } from 'vue'

export interface Variation {
  id: string
  name: string
  kind: string
  format: string
  mimeType: string
  width: number | null
  height: number | null
  fileSize: number | null
  url: string
  createdAt: string | Date
  updatedAt: string | Date
}

interface Props {
  width: number
  height: number
  fileSize: number
  mimeType: string
  variations: Variation[]
  loadingVariations: boolean
  saving: boolean
  tracing: boolean
  currentVariationId: string | null
}
const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'saveNew', name: string, kind: string): void
  (e: 'overwrite'): void
  (e: 'rename', variationId: string, name: string): void
  (e: 'delete', variationId: string): void
  (e: 'useVariation', variation: Variation): void
  (e: 'traceSvg', name: string): void
}>()

const newName = ref('')
const newKind = ref('edited')
const editingId = ref<string | null>(null)
const editingName = ref('')

function fmtSize(bytes: number): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function startRename(v: Variation) {
  editingId.value = v.id
  editingName.value = v.name
}
function submitRename() {
  if (editingId.value && editingName.value.trim()) {
    emit('rename', editingId.value, editingName.value.trim())
  }
  editingId.value = null
  editingName.value = ''
}

function handleSaveNew() {
  const name = newName.value.trim()
  if (!name) return
  emit('saveNew', name, newKind.value)
  newName.value = ''
}

function handleTrace() {
  const name = newName.value.trim() || `trace-${Date.now()}`
  emit('traceSvg', name)
  newName.value = ''
}
</script>

<template>
  <div class="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-l bg-background p-3 text-sm">
    <div class="space-y-1 rounded-md border p-3">
      <h3 class="text-xs font-medium uppercase text-muted-foreground">Metadata</h3>
      <div class="flex justify-between"><span class="text-muted-foreground">Size</span><span>{{ width }} × {{ height }}</span></div>
      <div class="flex justify-between"><span class="text-muted-foreground">File</span><span>{{ fmtSize(fileSize) }}</span></div>
      <div class="flex justify-between"><span class="text-muted-foreground">Type</span><span>{{ mimeType }}</span></div>
    </div>

    <div class="space-y-2 rounded-md border p-3">
      <h3 class="text-xs font-medium uppercase text-muted-foreground">Save</h3>
      <input
        v-model="newName"
        type="text"
        placeholder="Variation name"
        class="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
      />
      <select v-model="newKind" class="w-full rounded-md border bg-background px-2 py-1.5 text-sm">
        <option value="edited">Edited</option>
        <option value="bg-removed">Background removed</option>
        <option value="composite">Composite</option>
        <option value="upscaled">Upscaled</option>
      </select>
      <button
        type="button"
        class="w-full rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50"
        :disabled="saving || !newName.trim()"
        @click="handleSaveNew"
      >{{ saving ? 'Saving…' : 'Save as new' }}</button>
      <button
        v-if="currentVariationId"
        type="button"
        class="w-full rounded-md border px-3 py-2 text-sm transition-all hover:bg-muted active:scale-95 disabled:opacity-50"
        :disabled="saving"
        @click="emit('overwrite')"
      >{{ saving ? 'Saving…' : 'Overwrite current' }}</button>
      <button
        type="button"
        class="w-full rounded-md border border-dashed px-3 py-2 text-sm transition-all hover:bg-muted active:scale-95 disabled:opacity-50"
        :disabled="tracing"
        :title="'Runs potrace on the server. Works best on flat, high-contrast images (e.g. a background-removed PNG).'"
        @click="handleTrace"
      >{{ tracing ? 'Tracing…' : 'Trace to SVG' }}</button>
    </div>

    <div class="space-y-2">
      <h3 class="text-xs font-medium uppercase text-muted-foreground">Variations</h3>
      <p v-if="loadingVariations" class="text-xs text-muted-foreground">Loading…</p>
      <p v-else-if="variations.length === 0" class="text-xs text-muted-foreground italic">None yet.</p>
      <ul v-else class="space-y-2">
        <li
          v-for="v in variations"
          :key="v.id"
          class="rounded-md border p-2 transition-all hover:-translate-y-0.5 hover:shadow"
          :class="{ 'ring-2 ring-primary': v.id === currentVariationId }"
        >
          <div class="flex items-center gap-2">
            <img :src="v.url" class="h-10 w-10 shrink-0 rounded border object-cover bg-white" />
            <div class="min-w-0 flex-1">
              <input
                v-if="editingId === v.id"
                v-model="editingName"
                type="text"
                class="w-full rounded border bg-background px-1 py-0.5 text-xs"
                @blur="submitRename"
                @keydown.enter.prevent="submitRename"
                @keydown.escape="editingId = null"
              />
              <button v-else class="truncate text-left text-xs font-medium hover:underline" @click="startRename(v)">
                {{ v.name }}
              </button>
              <div class="truncate text-[10px] text-muted-foreground">{{ v.kind }} · {{ v.format }}</div>
            </div>
          </div>
          <div class="mt-1.5 flex gap-1.5">
            <button
              type="button"
              class="flex-1 rounded border px-2 py-1 text-[11px] hover:bg-muted"
              @click="emit('useVariation', v)"
            >Open</button>
            <button
              type="button"
              class="rounded border border-destructive/50 px-2 py-1 text-[11px] text-destructive hover:bg-destructive/10"
              @click="emit('delete', v.id)"
            >Delete</button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
