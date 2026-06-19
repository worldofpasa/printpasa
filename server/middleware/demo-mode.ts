import { requireUser, isDemoMode } from '~~/server/utils/auth'

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

const DEMO_ALLOWED_POST_PREFIXES = [
  '/api/auth',
]

export default defineEventHandler(async (event) => {
  if (!isDemoMode()) return

  const method = event.method.toUpperCase()
  if (!MUTATING_METHODS.has(method)) return

  const path = event.path
  if (DEMO_ALLOWED_POST_PREFIXES.some(prefix => path.startsWith(prefix))) return

  if (path === '/api/auth/sign-out') return

  throw createError({
    statusCode: 403,
    statusMessage: 'Demo mode is read-only. Self-host PrintPasa to make changes.',
  })
})
