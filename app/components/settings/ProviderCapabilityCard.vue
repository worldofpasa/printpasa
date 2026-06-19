<script setup lang="ts">
import { ref, computed } from 'vue'
import Badge from '~/components/ui/badge/Badge.vue'
import Collapsible from '~/components/ui/collapsible/Collapsible.vue'
import CollapsibleContent from '~/components/ui/collapsible/CollapsibleContent.vue'
import CollapsibleTrigger from '~/components/ui/collapsible/CollapsibleTrigger.vue'
import Switch from '~/components/ui/switch/Switch.vue'
import Input from '~/components/ui/input/Input.vue'
import Button from '~/components/ui/button/Button.vue'
import { ChevronRight, Trash2, Star, Plus, ExternalLink } from 'lucide-vue-next'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog'
import type { RegistryProviderRow } from '~/composables/useSettingsState'

interface Props {
  provider: RegistryProviderRow
  providerIndex: number
  envKeyConfigured?: boolean | null
}
const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'toggleModel', modelIndex: number, enabled: boolean): void
  (e: 'makeDefaultModel', modelIndex: number): void
  (e: 'addModel', modelId: string): void
  (e: 'deleteModel', modelIndex: number): void
  (e: 'deleteProvider'): void
}>()

const expanded = ref(false)

const newModelId = ref('')
function addModel() {
  if (!newModelId.value.trim()) return
  emit('addModel', newModelId.value.trim())
  newModelId.value = ''
}

const PROVIDER_MODEL_URLS: Record<string, string> = {
  deepinfra: 'https://deepinfra.com/models/text-generation',
  together: 'https://docs.together.ai/docs/inference-models',
  groq: 'https://console.groq.com/docs/models',
  openai: 'https://platform.openai.com/docs/models',
  anthropic: 'https://docs.anthropic.com/en/docs/models-overview',
  gemini: 'https://ai.google.dev/gemini-api/docs/models/gemini',
  xai: 'https://docs.x.ai/docs/models',
  fal: 'https://fal.ai/models',
}

const providerModelsUrl = computed(() => PROVIDER_MODEL_URLS[props.provider.id.toLowerCase()])

const modelCountLabel = computed(() => {
  const models = props.provider.models ?? []
  if (models.length === 0) return null
  const on = models.filter((m) => m.enabled !== false).length
  return `${on}/${models.length} models`
})
</script>

<template>
  <Collapsible
    v-model:open="expanded"
    class="overflow-hidden rounded-[1.35rem] border border-black/10 bg-slate-50/80 transition-opacity"
    :class="{ 'opacity-60': !provider.enabled }"
  >
    <div class="flex items-center gap-3 p-4">
      <Switch v-model="provider.enabled" @click.stop />

      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <div class="flex items-center gap-1.5">
            <span class="text-sm font-semibold text-slate-950">{{ provider.label }}</span>
            <a
              v-if="providerModelsUrl"
              :href="providerModelsUrl"
              target="_blank"
              title="View available models"
              class="text-slate-400 hover:text-slate-700 transition-colors"
              @click.stop
            >
              <ExternalLink class="h-3.5 w-3.5" />
            </a>
          </div>
          <Badge v-if="!provider.enabled" variant="muted">Disabled</Badge>
          <Badge v-else-if="envKeyConfigured === false" variant="muted">Missing API key</Badge>
          <Badge v-else-if="envKeyConfigured === true" variant="success">Key configured</Badge>
          <Badge v-if="modelCountLabel" variant="outline">{{ modelCountLabel }}</Badge>
        </div>
        <div class="mt-2 text-xs text-slate-500">
          <span>Env: </span>
          <code v-if="provider.envVarName" class="rounded bg-slate-950/5 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">{{ provider.envVarName }}</code>
          <span v-else class="italic">none configured</span>
        </div>
      </div>

      <AlertDialog>
        <AlertDialogTrigger as-child>
          <button type="button" class="rounded-full p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600" @click.stop>
            <Trash2 class="h-4 w-4" />
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Provider</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {{ provider.label }}? This will also remove all its configured models.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction class="bg-red-600 text-white hover:bg-red-700" @click="emit('deleteProvider')">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CollapsibleTrigger class="rounded-full p-2 transition-colors hover:bg-slate-950/5">
        <ChevronRight class="h-4 w-4 transition-transform" :class="{ 'rotate-90': expanded }" />
      </CollapsibleTrigger>
    </div>

    <CollapsibleContent>
      <div class="border-t border-black/10 p-4">
        <div v-if="provider.models" class="space-y-1.5">
          <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Models</div>
          
          <div class="mb-4 flex items-center gap-2 border-b border-black/5 pb-4">
            <Input v-model="newModelId" placeholder="Custom model ID (e.g. your-org/model)" class="h-8 flex-1 text-xs font-mono" @keyup.enter="addModel" />
            <Button size="sm" variant="secondary" class="h-8 px-3 text-xs" @click="addModel">
              <Plus class="mr-1.5 h-3.5 w-3.5" />
              Add
            </Button>
          </div>

          <template v-if="provider.models.length > 0">
            <div
              v-for="(model, modelIndex) in provider.models"
              :key="model.id"
              class="flex items-start justify-between gap-3 rounded-[1.1rem] border border-black/10 bg-white px-3 py-3 text-sm transition-opacity"
              :class="{ 'opacity-50': provider.enabled && model.enabled === false }"
            >
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-semibold text-slate-950">{{ model.label }}</span>
                  <Badge v-if="model.cost" variant="outline">{{ model.cost }}</Badge>
                  <Badge v-if="modelIndex === 0" variant="outline" class="border-amber-200 bg-amber-50 text-amber-700">Provider Default</Badge>
                </div>
                <div v-if="model.description" class="mt-1 text-xs leading-5 text-slate-500">{{ model.description }}</div>
                <code class="mt-2 inline-flex rounded bg-slate-950/5 px-1.5 py-0.5 text-[10px] text-slate-500">{{ model.id }}</code>
              </div>
              
              <div class="flex items-center gap-3">
                <button
                  v-if="modelIndex !== 0"
                  type="button"
                  title="Set as provider default"
                  class="text-slate-300 transition-colors hover:text-amber-500"
                  @click="emit('makeDefaultModel', modelIndex)"
                >
                  <Star class="h-4 w-4" />
                </button>
                <button
                  v-else
                  type="button"
                  title="Current provider default"
                  class="text-amber-400 cursor-default"
                >
                  <Star class="h-4 w-4 fill-amber-400" />
                </button>
                
                <Switch
                  :model-value="model.enabled !== false"
                  :disabled="!provider.enabled"
                  @update:model-value="emit('toggleModel', modelIndex, Boolean($event))"
                />
                
                <AlertDialog>
                  <AlertDialogTrigger as-child>
                    <button type="button" class="text-slate-400 transition-colors hover:text-red-600">
                      <Trash2 class="h-4 w-4" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Model</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to remove {{ model.label }}?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction class="bg-red-600 text-white hover:bg-red-700" @click="emit('deleteModel', modelIndex)">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </template>
          <p v-else class="text-xs italic text-slate-500 pt-2">No models defined.</p>
        </div>
      </div>
    </CollapsibleContent>
  </Collapsible>
</template>
