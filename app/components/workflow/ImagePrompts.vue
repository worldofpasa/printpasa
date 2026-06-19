<script setup lang="ts">
import Badge from '~/components/ui/badge/Badge.vue'
import Button from '~/components/ui/button/Button.vue'
import Checkbox from '~/components/ui/checkbox/Checkbox.vue'
import Input from '~/components/ui/input/Input.vue'
import Textarea from '~/components/ui/textarea/Textarea.vue'

const props = defineProps<{
  projectId: string
  project: any
}>()

const emit = defineEmits<{
  (e: 'ready', value: boolean): void
}>()

const promptsPerTheme = ref(5)
const isGenerating = ref(false)
const prompts = ref<any[]>([])
const themeNames = ref<Record<string, string>>({})
const editingId = ref<string | null>(null)
const editText = ref('')

// Group prompts by theme
const groupedPrompts = computed(() => {
  const groups: Record<string, { themeTitle: string; prompts: any[] }> = {}
  for (const prompt of prompts.value) {
    const tid = prompt.themeId
    if (!groups[tid]) {
      groups[tid] = {
        themeTitle: themeNames.value[tid] ?? 'Unknown Theme',
        prompts: [],
      }
    }
    groups[tid].prompts.push(prompt)
  }
  return Object.values(groups)
})

const selectedCount = computed(() => prompts.value.filter((p: any) => p.isSelected).length)

// Emit readiness whenever selection changes
watch(selectedCount, (count) => {
  emit('ready', count > 0)
}, { immediate: true })

// Load defaults and existing prompts on mount
onMounted(async () => {
  try {
    const settings = await $fetch<any>('/api/settings')
    if (settings.defaultPromptsPerTheme) promptsPerTheme.value = settings.defaultPromptsPerTheme
  } catch {}
  await loadThemeNames()
  await loadExistingPrompts()
})

async function loadThemeNames() {
  try {
    const data = await $fetch<{ themes: any[] }>(`/api/workflow/${props.projectId}/gather-idea/themes`)
    if (data.themes) {
      for (const t of data.themes) {
        themeNames.value[t.id] = t.title
      }
    }
  } catch {}
}

async function loadExistingPrompts() {
  try {
    const data = await $fetch<{ prompts: any[] }>(`/api/workflow/${props.projectId}/prompts`)
    if (data.prompts && data.prompts.length > 0) {
      prompts.value = data.prompts
    }
  } catch (err: any) {
    console.error('Failed to load existing prompts', err)
  }
}

async function generatePrompts() {
  isGenerating.value = true
  emit('ready', false)
  try {
    const result = await $fetch(`/api/workflow/${props.projectId}/prompts/generate`, {
      method: 'POST',
      body: { promptsPerTheme: promptsPerTheme.value },
    })
    prompts.value = (result as any).prompts
    // Load theme names for grouping
    await loadThemeNames()
    emit('ready', selectedCount.value > 0)
  } catch (err: any) {
    alert(err.data?.message ?? 'Failed to generate prompts')
  } finally {
    isGenerating.value = false
  }
}

function startEdit(prompt: any) {
  editingId.value = prompt.id
  editText.value = prompt.promptText
}

async function saveEdit(promptId: string) {
  try {
    await $fetch(`/api/workflow/${props.projectId}/prompts/update`, {
      method: 'PUT',
      body: { promptId, promptText: editText.value },
    })
    const idx = prompts.value.findIndex((p: any) => p.id === promptId)
    if (idx !== -1) prompts.value[idx].promptText = editText.value
    editingId.value = null
  } catch (err: any) {
    alert(err.data?.message ?? 'Failed to save prompt')
  }
}

function cancelEdit() {
  editingId.value = null
  editText.value = ''
}

async function togglePrompt(promptId: string, isSelected: boolean) {
  try {
    await $fetch(`/api/workflow/${props.projectId}/prompts/update`, {
      method: 'PUT',
      body: { promptId, isSelected: !isSelected },
    })
    const idx = prompts.value.findIndex((p: any) => p.id === promptId)
    if (idx !== -1) prompts.value[idx].isSelected = !isSelected
  } catch {}
}

function selectAllInGroup(themeId: string, select: boolean) {
  const groupPrompts = prompts.value.filter(p => p.themeId === themeId)
  for (const p of groupPrompts) {
    if (p.isSelected !== select) {
      togglePrompt(p.id, p.isSelected)
    }
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="rounded-[1.5rem] border border-black/10 bg-[#fffaf2] p-4 shadow-soft sm:p-5">
      <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="eyebrow">Prompt planning</p>
          <h3 class="mt-2 font-serif text-2xl font-semibold text-slate-950">Generate and refine the prompts that feed image creation.</h3>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Keep the strongest prompts selected, edit wording where needed, and carry only the best instructions into Stage 4.
          </p>
        </div>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div class="space-y-2">
            <label class="field-label">Prompts per theme</label>
            <Input
              v-model.number="promptsPerTheme"
              type="number"
              min="1"
              max="10"
              class="w-36"
            />
          </div>

          <Button :disabled="isGenerating" @click="generatePrompts">
            <svg v-if="isGenerating" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ isGenerating ? 'Generating prompts...' : 'Generate prompts' }}
          </Button>
        </div>
      </div>
    </div>

    <div v-if="groupedPrompts.length > 0" class="space-y-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 class="font-serif text-2xl font-semibold text-slate-950">Image prompts</h3>
          <p class="mt-1 text-sm text-slate-500">{{ prompts.length }} total prompts across {{ groupedPrompts.length }} theme groups.</p>
        </div>
        <Badge :variant="selectedCount > 0 ? 'success' : 'muted'">
          {{ selectedCount }} selected for generation
        </Badge>
      </div>

      <div
        v-for="(group, groupIdx) in groupedPrompts"
        :key="groupIdx"
        class="space-y-3"
      >
        <div class="rounded-[1.5rem] border border-black/10 bg-slate-50/70 p-4">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-3">
              <span class="flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-950 text-xs font-bold text-white">
              {{ groupIdx + 1 }}
              </span>
              <div>
                <h4 class="text-base font-semibold text-slate-950">{{ group.themeTitle }}</h4>
                <p class="text-xs text-slate-500">{{ group.prompts.length }} prompt{{ group.prompts.length === 1 ? '' : 's' }} in this theme.</p>
              </div>
            </div>

            <Badge variant="outline">
              {{ group.prompts.filter(p => p.isSelected).length }}/{{ group.prompts.length }} selected
            </Badge>
          </div>
        </div>

        <div class="space-y-3">
          <div
            v-for="(prompt, idx) in group.prompts"
            :key="prompt.id"
            class="rounded-[1.35rem] border bg-white p-4 transition-all sm:p-5"
            :class="prompt.isSelected
              ? 'border-slate-950 shadow-soft'
              : 'border-black/10 opacity-80'"
          >
            <div class="flex items-start gap-3">
              <Checkbox
                class="mt-1"
                :model-value="prompt.isSelected"
                @update:model-value="togglePrompt(prompt.id, prompt.isSelected)"
              />

              <div class="flex-1 min-w-0">
                <div class="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="muted">Prompt #{{ idx + 1 }}</Badge>
                  <Badge
                    v-if="prompt.designLane"
                    :variant="prompt.designLane === 'hybrid' ? 'default' : 'outline'"
                  >
                    {{ prompt.designLane === 'hybrid' ? 'Hybrid' : 'Graphic' }}
                  </Badge>
                  <Badge v-if="prompt.sloganText" variant="outline">
                    "{{ prompt.sloganText }}"
                  </Badge>
                  <Badge v-if="prompt.style" variant="outline">
                    {{ prompt.style }}
                  </Badge>
                </div>

                <div v-if="editingId === prompt.id" class="space-y-2">
                  <Textarea
                    v-model="editText"
                    rows="4"
                    class="min-h-[9rem] bg-slate-50"
                  />
                  <div class="flex gap-2">
                    <Button size="sm" @click="saveEdit(prompt.id)">
                      Save
                    </Button>
                    <Button size="sm" variant="outline" @click="cancelEdit">
                      Cancel
                    </Button>
                  </div>
                </div>
                <div v-else>
                  <p class="text-sm leading-6 text-slate-700">{{ prompt.promptText }}</p>
                  <Button class="mt-3" size="sm" variant="ghost" @click="startEdit(prompt)">
                    Edit Prompt
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="selectedCount > 0" class="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        {{ selectedCount }} prompts ready for image generation
      </div>
    </div>

    <div v-else class="rounded-[1.5rem] border border-dashed border-black/10 bg-slate-50/70 px-6 py-10 text-center">
      <p class="eyebrow">No prompts yet</p>
      <p class="mt-3 text-sm leading-6 text-slate-600">Generate a prompt set for your winning themes to unlock image generation.</p>
    </div>
  </div>
</template>
