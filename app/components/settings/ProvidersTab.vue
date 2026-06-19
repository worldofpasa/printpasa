<script setup lang="ts">
import { ref, computed } from 'vue'
import Badge from '~/components/ui/badge/Badge.vue'
import Card from '~/components/ui/card/Card.vue'
import CardContent from '~/components/ui/card/CardContent.vue'
import CardDescription from '~/components/ui/card/CardDescription.vue'
import CardHeader from '~/components/ui/card/CardHeader.vue'
import CardTitle from '~/components/ui/card/CardTitle.vue'
import { useSettingsState, type RegistryCapability } from '~/composables/useSettingsState'
import { isProviderImplemented } from '~~/shared/types/providers'
import ProviderCapabilityCard from './ProviderCapabilityCard.vue'

const { registryDraft, setModelEnabled, removeModel, removeProvider, makeDefaultModel, addModelToProvider, settings } = useSettingsState()

function envKeyConfigured(envVarName: string): boolean | null {
  if (!envVarName) return null
  if (envVarName === 'NUXT_KREA_API_KEY') return !!settings.value.hasKreaKey
  if (envVarName === 'NUXT_FAL_API_KEY') return !!settings.value.hasFalKey
  if (envVarName === 'NUXT_GEMINI_API_KEY') return !!settings.value.hasGeminiKey
  if (envVarName === 'NUXT_OPENAI_API_KEY') return !!settings.value.hasOpenaiKey
  if (envVarName === 'NUXT_ANTHROPIC_API_KEY') return !!settings.value.hasAnthropicKey
  if (envVarName === 'NUXT_XAI_API_KEY') return !!settings.value.hasXaiKey
  if (envVarName === 'NUXT_GROQ_API_KEY') return !!settings.value.hasGroqKey
  if (envVarName === 'NUXT_TOGETHER_API_KEY') return !!settings.value.hasTogetherKey
  if (envVarName === 'NUXT_DEEPINFRA_API_KEY') return !!settings.value.hasDeepinfraKey
  return null
}

type CapabilityTab = Extract<RegistryCapability, 'text-generation' | 'generation' | 'upscale' | 'background-removal'>

const tabs: { id: CapabilityTab; label: string; description: string }[] = [
  { id: 'text-generation',    label: 'Text generation',    description: 'LLM providers for stages 1–3 and product metadata.' },
  { id: 'generation',         label: 'Image generation',   description: 'Providers that generate images from prompts.' },
  { id: 'upscale',            label: 'Upscale',            description: 'Providers that enlarge existing images.' },
  { id: 'background-removal', label: 'Background removal', description: 'Providers that cut out subjects.' },
]

const activeCapability = ref<CapabilityTab>('text-generation')

const providers = computed(() => {
  return registryDraft.value
    .map((provider, providerIndex) => ({ provider, providerIndex }))
    .filter(({ provider }) =>
      provider.capabilities.includes(activeCapability.value)
      && isProviderImplemented(provider.id, activeCapability.value),
    )
    .sort((a, b) => {
      if (a.provider.enabled === b.provider.enabled) return 0
      return a.provider.enabled ? -1 : 1
    })
})

const activeTabMeta = computed(() => tabs.find((t) => t.id === activeCapability.value)!)
</script>

<template>
  <Card class="overflow-hidden border-black/10 bg-white/90 shadow-panel">
    <CardHeader class="gap-4 border-b border-black/5 bg-[#fffaf2]/80">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <CardTitle class="font-serif text-[1.85rem]">Provider availability</CardTitle>
          <CardDescription class="mt-2 max-w-3xl text-sm leading-6">
            {{ activeTabMeta.description }} Each provider reads its credential from the listed environment variable.
          </CardDescription>
        </div>
        <Badge variant="accent">{{ activeTabMeta.label }}</Badge>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          v-for="t in tabs"
          :key="t.id"
          type="button"
          class="rounded-full border px-4 py-2 text-sm font-semibold transition-all"
          :class="activeCapability === t.id
            ? 'border-slate-950 bg-slate-950 text-white shadow-soft'
            : 'border-black/10 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950'"
          @click="activeCapability = t.id"
        >
          {{ t.label }}
        </button>
      </div>
    </CardHeader>

    <CardContent class="space-y-4 p-6">
      <div v-if="providers.length === 0" class="rounded-[1.35rem] border border-dashed border-black/10 bg-slate-50/70 p-8 text-center text-sm text-slate-500">
        No providers registered for this capability.
      </div>

      <div v-else class="space-y-2">
        <ProviderCapabilityCard
          v-for="{ provider, providerIndex } in providers"
          :key="provider.rowKey"
          :provider="provider"
          :provider-index="providerIndex"
          :env-key-configured="envKeyConfigured(provider.envVarName)"
          @toggle-model="(modelIndex, enabled) => setModelEnabled(providerIndex, modelIndex, enabled)"
          @make-default-model="(modelIndex) => makeDefaultModel(providerIndex, modelIndex)"
          @add-model="(modelId) => addModelToProvider(providerIndex, modelId)"
          @delete-model="(modelIndex) => removeModel(providerIndex, modelIndex)"
          @delete-provider="() => removeProvider(providerIndex)"
        />
      </div>
    </CardContent>
  </Card>
</template>
