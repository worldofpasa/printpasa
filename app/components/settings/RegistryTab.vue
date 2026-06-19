<script setup lang="ts">
import Badge from '~/components/ui/badge/Badge.vue'
import Button from '~/components/ui/button/Button.vue'
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
import {
  useSettingsState,
  CAPABILITY_LABELS,
  CAPABILITY_OPTIONS,
} from '~/composables/useSettingsState'
import { isProviderImplemented } from '~~/shared/types/providers'

const {
  registryDraft,
  addProvider,
  removeProvider,
  setProviderCapability,
  providerImplementationText,
} = useSettingsState()

const credentialSources = [
  { value: 'user_or_env', label: 'User or env' },
  { value: 'env_only', label: 'Env only' },
  { value: 'service_env', label: 'Service env' },
] as const
</script>

<template>
  <Card class="overflow-hidden border-black/10 bg-white/90 shadow-panel">
    <CardHeader class="flex flex-col gap-4 border-b border-black/5 bg-[#fffaf2]/80 md:flex-row md:items-start md:justify-between">
      <div>
        <CardTitle class="font-serif text-[1.85rem]">Provider registry</CardTitle>
        <CardDescription class="mt-2 max-w-3xl text-sm leading-6">
          Editable capability map for text generation, image generation, background removal, upscaling, and fulfillment.
        </CardDescription>
      </div>
      <Button type="button" variant="outline" size="sm" @click="addProvider">Add provider</Button>
    </CardHeader>

    <CardContent class="space-y-4 p-6">
      <div
        v-for="(provider, index) in registryDraft"
        :key="provider.rowKey"
        class="space-y-5 rounded-[1.5rem] border border-black/10 bg-slate-50/80 p-5 transition-opacity"
        :class="{ 'opacity-60 grayscale-[0.5]': !provider.enabled }"
      >
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Registry row</Badge>
              <Badge v-if="provider.enabled" variant="success">Enabled</Badge>
              <Badge v-else variant="muted">Disabled</Badge>
            </div>
            <p class="text-sm leading-6 text-slate-600">
              Decide how the provider is exposed in the UI, where credentials come from, and which capabilities it can serve.
            </p>
          </div>

          <div class="flex items-center gap-3">
            <span class="text-sm font-medium text-slate-700">Enabled</span>
            <Switch v-model="provider.enabled" />
            <Button type="button" variant="outline" size="sm" @click="removeProvider(index)">Remove</Button>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div class="space-y-2">
            <Label class="text-xs uppercase tracking-[0.14em] text-slate-500">Provider ID</Label>
            <Input v-model="provider.id" type="text" />
          </div>
          <div class="space-y-2">
            <Label class="text-xs uppercase tracking-[0.14em] text-slate-500">Label</Label>
            <Input v-model="provider.label" type="text" />
          </div>
          <div class="space-y-2">
            <Label class="text-xs uppercase tracking-[0.14em] text-slate-500">Credential source</Label>
            <Select v-model="provider.credentialSource">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="source in credentialSources"
                  :key="source.value"
                  :value="source.value"
                >
                  {{ source.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div class="space-y-2">
          <Label class="text-xs uppercase tracking-[0.14em] text-slate-500">Capabilities</Label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="capability in CAPABILITY_OPTIONS.filter((c) => isProviderImplemented(provider.id, c))"
              :key="capability"
              type="button"
              class="rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-all"
              :class="provider.capabilities.includes(capability)
                ? 'border-slate-950 bg-slate-950 text-white'
                : 'border-black/10 bg-white text-slate-600 hover:bg-slate-100'"
              @click="setProviderCapability(index, capability, !provider.capabilities.includes(capability))"
            >
              {{ CAPABILITY_LABELS[capability] }}
            </button>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-3">
          <div class="space-y-2">
            <Label class="text-xs uppercase tracking-[0.14em] text-slate-500">Env variable name</Label>
            <Input v-model="provider.envVarName" type="text" />
          </div>
          <div class="space-y-2">
            <Label class="text-xs uppercase tracking-[0.14em] text-slate-500">Runtime config key</Label>
            <Input v-model="provider.runtimeConfigKey" type="text" />
          </div>
          <div class="space-y-2">
            <Label class="text-xs uppercase tracking-[0.14em] text-slate-500">User settings key</Label>
            <Input v-model="provider.userSettingsKey" type="text" />
          </div>
        </div>

        <div class="rounded-[1.1rem] border border-black/10 bg-white px-4 py-3">
          <p class="text-xs leading-6 text-slate-500">{{ providerImplementationText(provider) }}</p>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
