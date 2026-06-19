export interface AuditLogListItem {
  id: string
  actor: string
  actorId: string | null
  action: string
  target: string | null
  projectId: string | null
  stage: string | null
  runId: string | null
  pipelineJobId: string | null
  scheduleId: string | null
  level: string | null
  createdAt: string
  hasMetadata: boolean
}

export interface AuditLogFilters {
  q: string
  projectId: string
  stage: string
  actor: string
  level: string
  runId: string
  action: string
}

export interface AuditLogFilterOptions {
  projects: Array<{ id: string; name: string }>
  actors: string[]
  stages: Array<{ id: string; label: string }>
  levels: string[]
}

const DEFAULT_FILTERS: AuditLogFilters = {
  q: '',
  projectId: '',
  stage: '',
  actor: '',
  level: '',
  runId: '',
  action: '',
}

export function useAuditLogs() {
  const route = useRoute()
  const router = useRouter()

  const logs = ref<AuditLogListItem[]>([])
  const total = ref(0)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const filterOptions = ref<AuditLogFilterOptions | null>(null)
  const offset = ref(0)
  const limit = 50

  const filters = computed<AuditLogFilters>({
    get() {
      const query = route.query
      return {
        q: String(query.q ?? ''),
        projectId: String(query.projectId ?? ''),
        stage: String(query.stage ?? ''),
        actor: String(query.actor ?? ''),
        level: String(query.level ?? ''),
        runId: String(query.runId ?? ''),
        action: String(query.action ?? ''),
      }
    },
    set(next) {
      const query: Record<string, string> = {}
      for (const [key, value] of Object.entries(next)) {
        if (value) query[key] = value
      }
      router.replace({ query })
    },
  })

  function buildQueryParams() {
    const params: Record<string, string | number> = {
      limit,
      offset: offset.value,
    }
    const f = filters.value
    if (f.q) params.q = f.q
    if (f.projectId) params.projectId = f.projectId
    if (f.stage) params.stage = f.stage
    if (f.actor) params.actor = f.actor
    if (f.level) params.level = f.level
    if (f.runId) params.runId = f.runId
    if (f.action) params.action = f.action
    return params
  }

  async function fetchFilterOptions() {
    filterOptions.value = await $fetch<AuditLogFilterOptions>('/api/audit-logs/filters')
  }

  async function fetchLogs(resetOffset = true) {
    if (resetOffset) offset.value = 0
    isLoading.value = true
    error.value = null
    try {
      const result = await $fetch<{
        items: AuditLogListItem[]
        count: number
        total: number
      }>('/api/audit-logs', { query: buildQueryParams() })
      logs.value = result.items
      total.value = result.total
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load audit logs'
      error.value = message
      logs.value = []
      total.value = 0
    } finally {
      isLoading.value = false
    }
  }

  async function fetchLogDetail(id: string) {
    const result = await $fetch<{ item: AuditLogListItem & { metadata: Record<string, unknown> | null } }>(
      `/api/audit-logs/${id}`,
    )
    return result.item
  }

  function setFilter<K extends keyof AuditLogFilters>(key: K, value: AuditLogFilters[K]) {
    filters.value = { ...filters.value, [key]: value }
  }

  function clearFilters() {
    filters.value = { ...DEFAULT_FILTERS }
  }

  return {
    logs,
    total,
    isLoading,
    error,
    filterOptions,
    filters,
    offset,
    limit,
    fetchLogs,
    fetchFilterOptions,
    fetchLogDetail,
    setFilter,
    clearFilters,
  }
}
