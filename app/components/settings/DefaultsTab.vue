<script setup lang="ts">
import Badge from '~/components/ui/badge/Badge.vue'
import Card from '~/components/ui/card/Card.vue'
import CardContent from '~/components/ui/card/CardContent.vue'
import CardDescription from '~/components/ui/card/CardDescription.vue'
import CardHeader from '~/components/ui/card/CardHeader.vue'
import CardTitle from '~/components/ui/card/CardTitle.vue'
import Input from '~/components/ui/input/Input.vue'
import Label from '~/components/ui/label/Label.vue'
import Select from '~/components/ui/select/Select.vue'
import SelectContent from '~/components/ui/select/SelectContent.vue'
import SelectItem from '~/components/ui/select/SelectItem.vue'
import SelectTrigger from '~/components/ui/select/SelectTrigger.vue'
import SelectValue from '~/components/ui/select/SelectValue.vue'
import Switch from '~/components/ui/switch/Switch.vue'
import { SEARCH_PROVIDERS, SEARCH_PROVIDER_LABELS } from '~~/shared/types/providers'
import { STAGE_TEXT_GLOBAL_DEFAULT, TEXT_STAGE_LABELS, TEXT_WORKFLOW_STAGES } from '~~/shared/types/text-stages'
import { useSettingsState } from '~/composables/useSettingsState'

const {
  form,
  settings,
  searchKeyDraft,
  textOptions,
  generationOptions,
  upscaleOptions,
  backgroundOptions,
  fulfillmentOptions,
  stageTextConfig,
  modelsForTextProvider,
  stageTextProviderSelectValue,
  stageTextModelSelectValue,
  setStageTextProvider,
  setStageTextModel,
  clearStageTextConfig,
} = useSettingsState()
</script>

<template>
  <div class="flex flex-col gap-6">
    <Card class="overflow-hidden border-black/10 bg-white/90 shadow-panel">
      <CardHeader class="gap-3 border-b border-black/5 bg-[#fffaf2]/80">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle class="font-serif text-[1.85rem]">Default providers</CardTitle>
            <CardDescription class="mt-2 max-w-3xl text-sm leading-6">
              Starting stack for new projects unless overridden per project or per stage below.
            </CardDescription>
          </div>
          <Badge variant="accent">Routing defaults</Badge>
        </div>
      </CardHeader>

      <CardContent class="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3">
        <div class="rounded-[1.35rem] border p-4 transition-colors" :class="!textOptions.some(p => p.id === form.defaultAIProvider && p.enabled) ? 'border-red-500/40 bg-red-50/30' : 'border-black/10 bg-slate-50/80'">
          <Label class="field-label" :class="{'text-red-700': !textOptions.some(p => p.id === form.defaultAIProvider && p.enabled)}">AI provider</Label>
          <p class="mt-1 text-xs leading-5 text-slate-500">Ideas, validation, and prompt drafts.</p>
          <Select v-model="form.defaultAIProvider">
            <SelectTrigger class="mt-3" :class="{'border-red-300 ring-red-200 focus:ring-red-500': !textOptions.some(p => p.id === form.defaultAIProvider && p.enabled)}"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="p in textOptions" :key="p.id" :value="p.id" :disabled="!p.enabled">{{ p.label }}</SelectItem>
            </SelectContent>
          </Select>
          <p v-if="!textOptions.some(p => p.id === form.defaultAIProvider && p.enabled)" class="mt-2 text-[11px] font-medium text-red-600 flex items-center gap-1.5">
            <svg class="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <path stroke-linecap="round" d="M12 8v4M12 16h.01" />
            </svg>
            Selected provider is disabled or missing.
          </p>
        </div>

        <div class="rounded-[1.35rem] border p-4 transition-colors" :class="!generationOptions.some(p => p.id === form.defaultImageProvider && p.enabled) ? 'border-red-500/40 bg-red-50/30' : 'border-black/10 bg-slate-50/80'">
          <Label class="field-label" :class="{'text-red-700': !generationOptions.some(p => p.id === form.defaultImageProvider && p.enabled)}">Image provider</Label>
          <p class="mt-1 text-xs leading-5 text-slate-500">Stage 4 image generation.</p>
          <Select v-model="form.defaultImageProvider">
            <SelectTrigger class="mt-3" :class="{'border-red-300 ring-red-200 focus:ring-red-500': !generationOptions.some(p => p.id === form.defaultImageProvider && p.enabled)}"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="p in generationOptions" :key="p.id" :value="p.id" :disabled="!p.enabled">{{ p.label }}</SelectItem>
            </SelectContent>
          </Select>
          <p v-if="!generationOptions.some(p => p.id === form.defaultImageProvider && p.enabled)" class="mt-2 text-[11px] font-medium text-red-600 flex items-center gap-1.5">
            <svg class="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <path stroke-linecap="round" d="M12 8v4M12 16h.01" />
            </svg>
            Selected provider is disabled or missing.
          </p>
        </div>

        <div class="rounded-[1.35rem] border p-4 transition-colors" :class="!upscaleOptions.some(p => p.id === form.defaultUpscaleProvider && p.enabled) ? 'border-red-500/40 bg-red-50/30' : 'border-black/10 bg-slate-50/80'">
          <Label class="field-label" :class="{'text-red-700': !upscaleOptions.some(p => p.id === form.defaultUpscaleProvider && p.enabled)}">Upscale provider</Label>
          <p class="mt-1 text-xs leading-5 text-slate-500">Image enhancement during optimization.</p>
          <Select v-model="form.defaultUpscaleProvider">
            <SelectTrigger class="mt-3" :class="{'border-red-300 ring-red-200 focus:ring-red-500': !upscaleOptions.some(p => p.id === form.defaultUpscaleProvider && p.enabled)}"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="p in upscaleOptions" :key="p.id" :value="p.id" :disabled="!p.enabled">{{ p.label }}</SelectItem>
            </SelectContent>
          </Select>
          <p v-if="!upscaleOptions.some(p => p.id === form.defaultUpscaleProvider && p.enabled)" class="mt-2 text-[11px] font-medium text-red-600 flex items-center gap-1.5">
            <svg class="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <path stroke-linecap="round" d="M12 8v4M12 16h.01" />
            </svg>
            Selected provider is disabled or missing.
          </p>
        </div>

        <div class="rounded-[1.35rem] border p-4 transition-colors" :class="!backgroundOptions.some(p => p.id === form.defaultBackgroundRemovalProvider && p.enabled) ? 'border-red-500/40 bg-red-50/30' : 'border-black/10 bg-slate-50/80'">
          <Label class="field-label" :class="{'text-red-700': !backgroundOptions.some(p => p.id === form.defaultBackgroundRemovalProvider && p.enabled)}">Background removal</Label>
          <p class="mt-1 text-xs leading-5 text-slate-500">Cutout cleanup before placement.</p>
          <Select v-model="form.defaultBackgroundRemovalProvider">
            <SelectTrigger class="mt-3" :class="{'border-red-300 ring-red-200 focus:ring-red-500': !backgroundOptions.some(p => p.id === form.defaultBackgroundRemovalProvider && p.enabled)}"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="p in backgroundOptions" :key="p.id" :value="p.id" :disabled="!p.enabled">{{ p.label }}</SelectItem>
            </SelectContent>
          </Select>
          <p v-if="!backgroundOptions.some(p => p.id === form.defaultBackgroundRemovalProvider && p.enabled)" class="mt-2 text-[11px] font-medium text-red-600 flex items-center gap-1.5">
            <svg class="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <path stroke-linecap="round" d="M12 8v4M12 16h.01" />
            </svg>
            Selected provider is disabled or missing.
          </p>
        </div>

        <div class="rounded-[1.35rem] border p-4 sm:col-span-2 xl:col-span-1 transition-colors" :class="!fulfillmentOptions.some(p => p.id === form.defaultFulfillmentProvider && p.enabled) ? 'border-red-500/40 bg-red-50/30' : 'border-black/10 bg-slate-50/80'">
          <Label class="field-label" :class="{'text-red-700': !fulfillmentOptions.some(p => p.id === form.defaultFulfillmentProvider && p.enabled)}">Fulfillment provider</Label>
          <p class="mt-1 text-xs leading-5 text-slate-500">Product creation and publish handoff.</p>
          <Select v-model="form.defaultFulfillmentProvider">
            <SelectTrigger class="mt-3" :class="{'border-red-300 ring-red-200 focus:ring-red-500': !fulfillmentOptions.some(p => p.id === form.defaultFulfillmentProvider && p.enabled)}"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="p in fulfillmentOptions" :key="p.id" :value="p.id" :disabled="!p.enabled">{{ p.label }}</SelectItem>
            </SelectContent>
          </Select>
          <p v-if="!fulfillmentOptions.some(p => p.id === form.defaultFulfillmentProvider && p.enabled)" class="mt-2 text-[11px] font-medium text-red-600 flex items-center gap-1.5">
            <svg class="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <path stroke-linecap="round" d="M12 8v4M12 16h.01" />
            </svg>
            Selected provider is disabled or missing.
          </p>
        </div>
      </CardContent>
    </Card>

    <Card class="overflow-hidden border-black/10 bg-white/90 shadow-panel">
      <CardHeader class="gap-3 border-b border-black/5 bg-[#fffaf2]/80">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle class="font-serif text-[1.85rem]">Per-stage text models</CardTitle>
            <CardDescription class="mt-2 max-w-3xl text-sm leading-6">
              Optional overrides per workflow stage. Leave empty to use the global AI provider and its default enabled model.
            </CardDescription>
          </div>
          <Badge variant="outline">Stages 1–3 &amp; 5</Badge>
        </div>
      </CardHeader>

      <CardContent class="grid gap-4 p-6 sm:grid-cols-2">
        <div
          v-for="stage in TEXT_WORKFLOW_STAGES"
          :key="stage"
          class="rounded-[1.35rem] border p-4 transition-colors"
          :class="(stageTextConfig[stage]?.provider && !textOptions.some(p => p.id === stageTextConfig[stage]?.provider && p.enabled)) || (!stageTextConfig[stage]?.provider && !textOptions.some(p => p.id === form.defaultAIProvider && p.enabled)) ? 'border-red-500/40 bg-red-50/30' : 'border-black/10 bg-slate-50/80'"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <Label class="field-label" :class="{'text-red-700': (stageTextConfig[stage]?.provider && !textOptions.some(p => p.id === stageTextConfig[stage]?.provider && p.enabled)) || (!stageTextConfig[stage]?.provider && !textOptions.some(p => p.id === form.defaultAIProvider && p.enabled))} ">{{ TEXT_STAGE_LABELS[stage] }}</Label>
              <p class="mt-1 text-xs leading-5 text-slate-500">
                {{ stageTextConfig[stage]?.provider ? 'Custom routing' : 'Uses global default' }}
              </p>
            </div>
            <button
              v-if="stageTextConfig[stage]?.provider"
              type="button"
              class="text-xs font-semibold text-slate-500 underline-offset-2 hover:text-slate-950 hover:underline"
              @click="clearStageTextConfig(stage)"
            >
              Clear
            </button>
          </div>

          <Select
            :model-value="stageTextProviderSelectValue(stage)"
            @update:model-value="(v) => setStageTextProvider(stage, String(v))"
          >
            <SelectTrigger class="mt-3" :class="{'border-red-300 ring-red-200 focus:ring-red-500': (stageTextConfig[stage]?.provider && !textOptions.some(p => p.id === stageTextConfig[stage]?.provider && p.enabled)) || (!stageTextConfig[stage]?.provider && !textOptions.some(p => p.id === form.defaultAIProvider && p.enabled))}"><SelectValue placeholder="Global default" /></SelectTrigger>
            <SelectContent>
              <SelectItem :value="STAGE_TEXT_GLOBAL_DEFAULT">Global default</SelectItem>
              <SelectItem v-for="p in textOptions" :key="p.id" :value="p.id" :disabled="!p.enabled">{{ p.label }}</SelectItem>
            </SelectContent>
          </Select>
          
          <p v-if="stageTextConfig[stage]?.provider && !textOptions.some(p => p.id === stageTextConfig[stage]?.provider && p.enabled)" class="mt-2 text-[11px] font-medium text-red-600 flex items-center gap-1.5">
            <svg class="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <path stroke-linecap="round" d="M12 8v4M12 16h.01" />
            </svg>
            Custom provider is disabled or missing.
          </p>
          <p v-else-if="!stageTextConfig[stage]?.provider && !textOptions.some(p => p.id === form.defaultAIProvider && p.enabled)" class="mt-2 text-[11px] font-medium text-red-600 flex items-center gap-1.5">
            <svg class="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <path stroke-linecap="round" d="M12 8v4M12 16h.01" />
            </svg>
            Global default provider is disabled or missing.
          </p>

          <div v-if="stageTextConfig[stage]?.provider" class="mt-3">
            <Select
              :model-value="stageTextConfig[stage]?.model ?? '__provider_default__'"
              @update:model-value="(v) => setStageTextModel(stage, v === '__provider_default__' ? '' : String(v))"
            >
              <SelectTrigger>
                <SelectValue :placeholder="modelsForTextProvider(stageTextConfig[stage]!.provider!)[0]?.id ?? 'Provider default model'" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__provider_default__">
                  Provider Default
                  <span v-if="modelsForTextProvider(stageTextConfig[stage]!.provider!)[0]?.id" class="ml-1 text-slate-400">
                    ({{ modelsForTextProvider(stageTextConfig[stage]!.provider!)[0]?.id }})
                  </span>
                </SelectItem>
                <SelectItem
                  v-for="m in modelsForTextProvider(stageTextConfig[stage]!.provider!)"
                  :key="m.id"
                  :value="m.id"
                >
                  {{ m.id }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p class="mt-1.5 text-[0.7rem] text-slate-400">Add models to this provider in the <b>Providers</b> tab.</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card class="overflow-hidden border-black/10 bg-white/90 shadow-panel">
      <CardHeader class="gap-3 border-b border-black/5 bg-[#fffaf2]/80">
        <div class="flex items-center justify-between gap-3">
          <div>
            <CardTitle class="font-serif text-[1.75rem]">Workflow defaults</CardTitle>
            <CardDescription class="mt-2 text-sm leading-6">
              Starting values that shape how much output each new run creates.
            </CardDescription>
          </div>
          <Badge variant="muted">Volume controls</Badge>
        </div>
      </CardHeader>

      <CardContent class="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
        <div class="rounded-[1.2rem] border border-black/10 bg-slate-50/80 p-4">
          <Label class="field-label">Theme count</Label>
          <Input v-model.number="form.defaultThemeCount" class="mt-3" type="number" min="1" max="50" />
          <p class="mt-2 text-xs text-slate-500">Themes per run (1–50)</p>
        </div>
        <div class="rounded-[1.2rem] border border-black/10 bg-slate-50/80 p-4">
          <Label class="field-label">Winner count</Label>
          <Input v-model.number="form.defaultWinnerCount" class="mt-3" type="number" min="1" max="20" />
          <p class="mt-2 text-xs text-slate-500">Winners in validation (1–20)</p>
        </div>
        <div class="rounded-[1.2rem] border border-black/10 bg-slate-50/80 p-4">
          <Label class="field-label">Prompts per theme</Label>
          <Input v-model.number="form.defaultPromptsPerTheme" class="mt-3" type="number" min="1" max="10" />
          <p class="mt-2 text-xs text-slate-500">Image prompts per winning theme (1–10)</p>
        </div>
        <div class="rounded-[1.2rem] border border-black/10 bg-slate-50/80 p-4">
          <Label class="field-label">Images per prompt</Label>
          <Input v-model.number="form.defaultImagesPerPrompt" class="mt-3" type="number" min="1" max="10" />
          <p class="mt-2 text-xs text-slate-500">Images per prompt (1–10)</p>
        </div>
        <div class="rounded-[1.2rem] border border-black/10 bg-slate-50/80 p-4 sm:col-span-2 lg:col-span-1">
          <Label class="field-label">Max product variants</Label>
          <Input v-model.number="form.maxProductVariants" class="mt-3" type="number" min="1" max="100" />
          <p class="mt-2 text-xs text-slate-500">Color variants per product (1–100)</p>
        </div>
      </CardContent>
    </Card>

    <Card class="overflow-hidden border-black/10 bg-white/90 shadow-panel">
      <CardHeader class="gap-3 border-b border-black/5 bg-[#fffaf2]/80">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle class="font-serif text-[1.75rem]">Idea research search</CardTitle>
            <CardDescription class="mt-2 max-w-3xl text-sm leading-6">
              Stage 1 uses this provider for Pinterest, TikTok, and Reddit web fallback. Google Trends keywords need SearchAPI or SerpAPI; Serper.dev is Google web search only.
            </CardDescription>
          </div>
          <Badge variant="outline">Stage 1</Badge>
        </div>
      </CardHeader>

      <CardContent class="grid gap-4 p-6 sm:grid-cols-2">
        <div class="rounded-[1.35rem] border border-black/10 bg-slate-50/80 p-4 sm:col-span-2">
          <Label class="field-label">Default search provider</Label>
          <Select v-model="form.defaultSearchProvider">
            <SelectTrigger class="mt-3 max-w-md"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="p in SEARCH_PROVIDERS" :key="p" :value="p">
                {{ SEARCH_PROVIDER_LABELS[p] }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="rounded-[1.35rem] border border-black/10 bg-slate-50/80 p-4">
          <div class="flex items-center gap-2">
            <Label class="field-label">Serper.dev API key</Label>
            <Badge :variant="settings.hasSerperKey ? 'success' : 'muted'">
              {{ settings.hasSerperKey ? 'Configured' : 'Missing' }}
            </Badge>
          </div>
          <Input
            v-model="searchKeyDraft.serperApiKey"
            class="mt-3 font-mono text-sm"
            type="password"
            autocomplete="off"
            placeholder="Leave blank to keep existing key"
          />
          <p class="mt-2 text-[0.72rem] font-mono text-slate-500">NUXT_SERPER_API_KEY</p>
        </div>

        <div class="rounded-[1.35rem] border border-black/10 bg-slate-50/80 p-4">
          <div class="flex items-center gap-2">
            <Label class="field-label">SearchAPI.io key</Label>
            <Badge :variant="settings.hasSearchapiKey ? 'success' : 'muted'">
              {{ settings.hasSearchapiKey ? 'Configured' : 'Missing' }}
            </Badge>
          </div>
          <Input
            v-model="searchKeyDraft.searchapiKey"
            class="mt-3 font-mono text-sm"
            type="password"
            autocomplete="off"
            placeholder="Leave blank to keep existing key"
          />
          <p class="mt-2 text-[0.72rem] font-mono text-slate-500">NUXT_SEARCHAPI_KEY</p>
        </div>

        <div class="rounded-[1.35rem] border border-black/10 bg-slate-50/80 p-4 sm:col-span-2 lg:col-span-1">
          <div class="flex items-center gap-2">
            <Label class="field-label">SerpAPI key</Label>
            <Badge :variant="settings.hasSerpapiKey ? 'success' : 'muted'">
              {{ settings.hasSerpapiKey ? 'Configured' : 'Missing' }}
            </Badge>
          </div>
          <Input
            v-model="searchKeyDraft.serpapiKey"
            class="mt-3 font-mono text-sm"
            type="password"
            autocomplete="off"
            placeholder="Leave blank to keep existing key"
          />
          <p class="mt-2 text-[0.72rem] font-mono text-slate-500">NUXT_SERPAPI_KEY · also used for Stage 2 brand-risk</p>
        </div>
      </CardContent>
    </Card>

    <Card class="overflow-hidden border-black/10 bg-white/90 shadow-panel">
      <CardHeader class="gap-3 border-b border-black/5 bg-[#fffaf2]/80">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle class="font-serif text-[1.75rem]">Validation safeguards</CardTitle>
            <CardDescription class="mt-2 max-w-3xl text-sm leading-6">
              Stage 2 can call live APIs for stronger trademark and brand-risk checks when credentials exist.
            </CardDescription>
          </div>
          <Badge variant="outline">Stage 2</Badge>
        </div>
      </CardHeader>

      <CardContent class="grid gap-4 p-6 sm:grid-cols-2">
        <div
          class="rounded-[1.35rem] border p-4 transition-opacity"
          :class="settings.hasRapidapiKey ? 'border-black/10 bg-slate-50/80' : 'border-dashed border-black/10 bg-slate-50/50 opacity-60'"
          :title="settings.hasRapidapiKey ? '' : 'RapidAPI key not configured'"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-semibold text-slate-950">Trademark check</h3>
                <Badge :variant="settings.hasRapidapiKey ? 'success' : 'muted'">
                  {{ settings.hasRapidapiKey ? 'Configured' : 'Missing key' }}
                </Badge>
              </div>
              <p class="mt-2 text-sm leading-6 text-slate-600">RapidAPI / USPTO coverage for stronger screening before ideas become winners.</p>
              <p class="mt-2 text-[0.72rem] font-mono text-slate-500">NUXT_RAPIDAPI_KEY</p>
            </div>
            <Switch v-model="form.useTrademarkApi" :disabled="!settings.hasRapidapiKey" />
          </div>
        </div>

        <div
          class="rounded-[1.35rem] border p-4 transition-opacity"
          :class="settings.hasSerpapiKey ? 'border-black/10 bg-slate-50/80' : 'border-dashed border-black/10 bg-slate-50/50 opacity-60'"
          :title="settings.hasSerpapiKey ? '' : 'SerpAPI key not configured'"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-semibold text-slate-950">Brand-risk check</h3>
                <Badge :variant="settings.hasSerpapiKey ? 'success' : 'muted'">
                  {{ settings.hasSerpapiKey ? 'Configured' : 'Missing key' }}
                </Badge>
              </div>
              <p class="mt-2 text-sm leading-6 text-slate-600">SerpAPI search checks for riskier associations, market confusion, or overlap with active brands.</p>
              <p class="mt-2 text-[0.72rem] font-mono text-slate-500">NUXT_SERPAPI_KEY</p>
            </div>
            <Switch v-model="form.useBrandRiskApi" :disabled="!settings.hasSerpapiKey" />
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
