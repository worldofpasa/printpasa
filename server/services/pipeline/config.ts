export function getPipelineDefaults() {
  return {
    themeCount: 10,
    winnerCount: 5,
    promptsPerTheme: 5,
    trendSource: 'reddit' as const,
    niche: 'custom' as const,
  }
}

export function getPipelineApiBaseUrl() {
  const config = useRuntimeConfig()
  const url = (config.public.appUrl as string)?.trim()
  if (url) return url.replace(/\/$/, '')
  return 'http://localhost:3000'
}

export function getPipelineServiceToken() {
  const token = (useRuntimeConfig().serviceToken as string)?.trim()
  if (!token) {
    throw new Error('NUXT_SERVICE_TOKEN is not configured')
  }
  return token
}

export function getPipelineOwnerUserId() {
  const id = (useRuntimeConfig().pipelineOwnerUserId as string)?.trim()
  if (!id) {
    throw new Error('NUXT_PIPELINE_OWNER_USER_ID is not configured')
  }
  return id
}

export function parseAllowedChatIds(raw: unknown): Set<string> {
  const text = typeof raw === 'string' ? raw : raw ? String(raw) : ''
  if (!text.trim()) return new Set()
  return new Set(
    text.split(',').map((id) => id.trim()).filter(Boolean),
  )
}

export function getDefaultTelegramChatId(): number | undefined {
  const first = [...parseAllowedChatIds(useRuntimeConfig().telegramAllowedChatIds)][0]
  if (!first) return undefined
  const chatId = Number(first)
  return Number.isFinite(chatId) ? chatId : undefined
}
