import { isAuthBypassEnabled } from '~~/server/utils/auth'
import { getAuth } from '~~/server/lib/auth'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('afterResponse', async (event) => {
    if (isAuthBypassEnabled()) return

    const path = event.path
    if (!path.startsWith('/api/auth')) return
    if (event.node.res.statusCode && event.node.res.statusCode >= 400) return

    const auth = getAuth()
    const session = await auth.api.getSession({ headers: event.headers })
    const user = session?.user
    if (!user?.id) return

    const { logAuditEvent, auditLogExists } = await import('~~/server/services/audit-log')
    const method = path.includes('callback') ? 'google_oauth' : 'email_password'
    const dedupeId = `auth-login-${user.id}-${Math.floor(Date.now() / 60_000)}`
    if (await auditLogExists(dedupeId)) return

    await logAuditEvent({
      id: dedupeId,
      actor: 'USER',
      actorId: user.id,
      action: 'auth.login_succeeded',
      target: `user:${user.id}`,
      level: 'success',
      metadata: {
        method,
        email: user.email,
        name: user.name,
      },
    })
  })
})
