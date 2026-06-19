<script setup lang="ts">
import Badge from '~/components/ui/badge/Badge.vue'
import Card from '~/components/ui/card/Card.vue'
import CardContent from '~/components/ui/card/CardContent.vue'
import CardDescription from '~/components/ui/card/CardDescription.vue'
import CardHeader from '~/components/ui/card/CardHeader.vue'
import CardTitle from '~/components/ui/card/CardTitle.vue'
import Switch from '~/components/ui/switch/Switch.vue'

type Schedule = {
  id: string
  name: string
  interval: string
  discoveryMode: string
  niche: string | null
  enabled: boolean
  lastRunAt: string | null
  nextRunAt: string | null
}

const schedules = ref<Schedule[]>([])
const loading = ref(true)
const toggling = ref<Set<string>>(new Set())
const error = ref<string | null>(null)

async function fetchSchedules() {
  try {
    schedules.value = await $fetch<Schedule[]>('/api/settings/schedules')
  } catch {
    error.value = 'Failed to load schedules'
  } finally {
    loading.value = false
  }
}

async function toggleEnabled(schedule: Schedule) {
  if (toggling.value.has(schedule.id)) return
  toggling.value = new Set([...toggling.value, schedule.id])
  const next = !schedule.enabled
  try {
    const updated = await $fetch<Schedule>(`/api/settings/schedules/${schedule.id}`, {
      method: 'PATCH',
      body: { enabled: next },
    })
    const idx = schedules.value.findIndex((s) => s.id === schedule.id)
    if (idx !== -1) schedules.value[idx] = updated
  } catch {
    // revert on error — the switch binding is derived from schedules.value so no extra action needed
  } finally {
    const next = new Set(toggling.value)
    next.delete(schedule.id)
    toggling.value = next
  }
}

function formatDate(val: string | null): string {
  if (!val) return '—'
  return new Date(val).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const INTERVAL_LABELS: Record<string, string> = {
  'daily-4am': 'Daily at 4 AM',
  'daily-6am': 'Daily at 6 AM',
  'daily-6pm': 'Daily at 6 PM',
  'daily': 'Daily',
  'hourly': 'Hourly',
  'weekly': 'Weekly',
}

function intervalLabel(interval: string) {
  return INTERVAL_LABELS[interval] ?? interval
}

onMounted(fetchSchedules)
</script>

<template>
  <Card class="overflow-hidden border-black/10 bg-white/90 shadow-panel">
    <CardHeader class="border-b border-black/5 bg-[#fffaf2]/80">
      <CardTitle class="font-serif text-[1.85rem]">Pipeline schedules</CardTitle>
      <CardDescription class="mt-2 max-w-3xl text-sm leading-6">
        Automated research jobs that run on a fixed schedule. Toggle a schedule off to pause it without deleting it.
      </CardDescription>
    </CardHeader>

    <CardContent class="p-6">
      <div v-if="loading" class="flex justify-center py-12">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>

      <p v-else-if="error" class="text-sm text-red-600">{{ error }}</p>

      <p v-else-if="schedules.length === 0" class="text-sm text-slate-500">
        No schedules found.
      </p>

      <div v-else class="space-y-3">
        <div
          v-for="schedule in schedules"
          :key="schedule.id"
          class="flex items-center justify-between gap-4 rounded-[1.5rem] border border-black/10 bg-slate-50/80 px-5 py-4 transition-opacity"
          :class="{ 'opacity-60': !schedule.enabled }"
        >
          <div class="min-w-0 flex-1 space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-medium text-slate-900">{{ schedule.name }}</span>
              <Badge variant="outline" class="text-xs">{{ intervalLabel(schedule.interval) }}</Badge>
              <Badge :variant="schedule.enabled ? 'success' : 'muted'" class="text-xs">
                {{ schedule.enabled ? 'Enabled' : 'Disabled' }}
              </Badge>
            </div>
            <div class="flex flex-wrap gap-4 text-xs text-slate-500">
              <span>Mode: {{ schedule.discoveryMode }}</span>
              <span v-if="schedule.niche">Niche: {{ schedule.niche }}</span>
              <span>Last run: {{ formatDate(schedule.lastRunAt) }}</span>
              <span>Next run: {{ formatDate(schedule.nextRunAt) }}</span>
            </div>
          </div>

          <Switch
            :model-value="schedule.enabled"
            :disabled="toggling.has(schedule.id)"
            @update:model-value="toggleEnabled(schedule)"
          />
        </div>
      </div>
    </CardContent>
  </Card>
</template>
