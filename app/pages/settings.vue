<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed } from 'vue'
import Tabs from '~/components/ui/tabs/Tabs.vue'
import TabsContent from '~/components/ui/tabs/TabsContent.vue'
import TabsList from '~/components/ui/tabs/TabsList.vue'
import TabsTrigger from '~/components/ui/tabs/TabsTrigger.vue'
import Button from '~/components/ui/button/Button.vue'
import DefaultsTab from '~/components/settings/DefaultsTab.vue'
import ProvidersTab from '~/components/settings/ProvidersTab.vue'
import RegistryTab from '~/components/settings/RegistryTab.vue'
import SchedulesTab from '~/components/settings/SchedulesTab.vue'
import CatalogTab from '~/components/settings/CatalogTab.vue'
import { useSettingsState } from '~/composables/useSettingsState'

const {
  isLoading,
  isSaving,
  hasUnsavedChanges,
  saveNotice,
  loadSettings,
  clearSaveNoticeTimer,
  save,
} = useSettingsState()

const route = useRoute()
const router = useRouter()

const VALID_TABS = ['defaults', 'providers', 'registry', 'schedules', 'catalog'] as const
type TabId = typeof VALID_TABS[number]

const active = computed<TabId>({
  get() {
    const q = String(route.query.tab ?? '')
    return (VALID_TABS.includes(q as TabId) ? q : 'defaults') as TabId
  },
  set(next) {
    router.replace({ query: { ...route.query, tab: next } })
  },
})

function handleKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault()
    if (!isSaving.value) save()
  }
}

onMounted(async () => {
  try {
    await loadSettings()
  } finally {
    isLoading.value = false
  }
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  clearSaveNoticeTimer()
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-8 pb-16">
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="-translate-y-1 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition-all duration-300 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="-translate-y-1 opacity-0"
    >
      <div
        v-if="saveNotice"
        class="rounded-[1.35rem] border px-4 py-3 text-sm shadow-soft"
        :class="saveNotice.type === 'success'
          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
          : 'border-red-300 bg-red-50 text-red-800'"
      >
        {{ saveNotice.message }}
      </div>
    </Transition>

    <div v-if="isLoading" class="surface-card flex items-center justify-center py-16">
      <div class="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>

    <Tabs v-else v-model="active" class="space-y-6">
      <div class="surface-card p-4 sm:p-5">
        <div class="flex items-center justify-between gap-4">
          <TabsList class="justify-start overflow-x-auto">
            <TabsTrigger value="defaults">Defaults</TabsTrigger>
            <TabsTrigger value="providers">Providers</TabsTrigger>
            <TabsTrigger value="registry">Registry</TabsTrigger>
            <TabsTrigger value="schedules">Schedules</TabsTrigger>
            <TabsTrigger value="catalog">Catalog</TabsTrigger>
          </TabsList>

          <Button
            id="settings-save-btn"
            type="button"
            :disabled="isSaving"
            class="relative shrink-0 transition-all active:scale-95"
            :class="hasUnsavedChanges && !isSaving ? 'opacity-100' : 'opacity-60'"
            @click="save"
          >
            <span v-if="isSaving" class="flex items-center gap-2">
              <span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Saving…
            </span>
            <span v-else class="flex items-center gap-2">
              Save
              <kbd class="hidden rounded bg-white/20 px-1.5 py-0.5 text-[0.65rem] font-mono leading-none sm:inline">⌘S</kbd>
            </span>
            <!-- unsaved dot indicator -->
            <span
              v-if="hasUnsavedChanges && !isSaving"
              class="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-white"
            />
          </Button>
        </div>
      </div>

      <TabsContent value="defaults" class="mt-0 focus-visible:ring-0 focus-visible:ring-offset-0">
        <DefaultsTab />
      </TabsContent>
      <TabsContent value="providers" class="mt-0 focus-visible:ring-0 focus-visible:ring-offset-0">
        <ProvidersTab />
      </TabsContent>
      <TabsContent value="registry" class="mt-0 focus-visible:ring-0 focus-visible:ring-offset-0">
        <RegistryTab />
      </TabsContent>
      <TabsContent value="schedules" class="mt-0 focus-visible:ring-0 focus-visible:ring-offset-0">
        <SchedulesTab />
      </TabsContent>
      <TabsContent value="catalog" class="mt-0 focus-visible:ring-0 focus-visible:ring-offset-0">
        <CatalogTab />
      </TabsContent>
    </Tabs>
  </div>
</template>
