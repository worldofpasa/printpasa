import type { H3Event } from 'h3'

function parsePrefixes(raw: string | undefined): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map(p => p.trim())
    .filter(Boolean)
}

export default defineEventHandler((event: H3Event) => {
  const config = useRuntimeConfig()
  const prefixes = parsePrefixes(config.serviceProtectedPrefixes as string)
  if (prefixes.length === 0) return

  const path = event.path || ''
  const matched = prefixes.some(prefix => path.startsWith(prefix))
  if (!matched) return

  const expected = config.serviceToken as string
  if (!expected) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Service auth not configured',
    })
  }

  const provided = getHeader(event, 'x-service-token')
  if (!provided || provided !== expected) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
})
