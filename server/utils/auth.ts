import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { useDB, schema } from '../database'
import { getAuth } from '../lib/auth'

export interface AuthenticatedUser {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  isSuperuser?: boolean
}

const LOCAL_AUTH_BYPASS_USER = {
  id: 'local-auth-bypass-user',
  email: 'local@printpasa.dev',
  name: 'Local Workspace',
  avatarUrl: null,
  role: 'superuser',
}

const DEMO_VIEWER_USER = {
  id: 'demo-viewer',
  email: 'demo@printpasa.local',
  name: 'Demo Viewer',
  avatarUrl: null,
  role: 'user',
}

function isAuthDisabledValue(value: unknown) {
  return value === true || value === 'true'
}

export function isDemoMode() {
  return process.env.NUXT_DEMO_MODE === 'true'
}

export function isAuthBypassEnabled() {
  const config = useRuntimeConfig()
  return isAuthDisabledValue(config.disableAuth) || process.env.NUXT_DISABLE_AUTH === 'true'
}

function toAuthenticatedUser(user: {
  id: string
  email: string
  name: string
  image?: string | null
  role?: string | null
}): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.image ?? null,
    isSuperuser: user.role === 'superuser',
  }
}

export async function getAuthBypassUser(): Promise<AuthenticatedUser> {
  const db = useDB()

  const existing = await db.query.users.findFirst({
    where: eq(schema.users.id, LOCAL_AUTH_BYPASS_USER.id),
  })

  if (existing) {
    if (
      existing.email !== LOCAL_AUTH_BYPASS_USER.email ||
      existing.name !== LOCAL_AUTH_BYPASS_USER.name ||
      existing.role !== LOCAL_AUTH_BYPASS_USER.role
    ) {
      const [updated] = await db
        .update(schema.users)
        .set({
          email: LOCAL_AUTH_BYPASS_USER.email,
          name: LOCAL_AUTH_BYPASS_USER.name,
          image: LOCAL_AUTH_BYPASS_USER.avatarUrl,
          role: LOCAL_AUTH_BYPASS_USER.role,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, LOCAL_AUTH_BYPASS_USER.id))
        .returning()

      return toAuthenticatedUser(updated)
    }

    return toAuthenticatedUser(existing)
  }

  const [user] = await db
    .insert(schema.users)
    .values({
      id: LOCAL_AUTH_BYPASS_USER.id,
      email: LOCAL_AUTH_BYPASS_USER.email,
      name: LOCAL_AUTH_BYPASS_USER.name,
      image: LOCAL_AUTH_BYPASS_USER.avatarUrl,
      role: LOCAL_AUTH_BYPASS_USER.role,
      emailVerified: true,
    })
    .returning()

  return toAuthenticatedUser(user)
}

export async function getDemoViewerUser(): Promise<AuthenticatedUser> {
  const db = useDB()
  const existing = await db.query.users.findFirst({
    where: eq(schema.users.id, DEMO_VIEWER_USER.id),
  })

  if (existing) {
    return toAuthenticatedUser(existing)
  }

  const [user] = await db
    .insert(schema.users)
    .values({
      id: DEMO_VIEWER_USER.id,
      email: DEMO_VIEWER_USER.email,
      name: DEMO_VIEWER_USER.name,
      image: DEMO_VIEWER_USER.avatarUrl,
      role: DEMO_VIEWER_USER.role,
      emailVerified: true,
    })
    .returning()

  return toAuthenticatedUser(user)
}

const SERVICE_AGENT_USER: AuthenticatedUser = {
  id: 'service-agent',
  email: 'service@printpasa.dev',
  name: 'Service Agent',
  avatarUrl: null,
  isSuperuser: true,
}

export function getServiceUser(event: H3Event): AuthenticatedUser | null {
  const config = useRuntimeConfig()
  const expected = config.serviceToken as string
  if (!expected) return null

  const provided = getHeader(event, 'x-service-token')
  if (!provided || provided !== expected) return null

  return SERVICE_AGENT_USER
}

async function sessionUserFromBetterAuth(event: H3Event): Promise<AuthenticatedUser | null> {
  const auth = getAuth()
  const session = await auth.api.getSession({
    headers: event.headers,
  })

  if (!session?.user) return null

  const db = useDB()
  const dbUser = await db.query.users.findFirst({
    where: eq(schema.users.id, session.user.id),
  })

  if (dbUser) {
    return toAuthenticatedUser(dbUser)
  }

  return toAuthenticatedUser({
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
    role: (session.user as { role?: string }).role,
  })
}

export async function requireUser(event: H3Event) {
  if (isDemoMode()) {
    return await getDemoViewerUser()
  }

  const sessionUser = await sessionUserFromBetterAuth(event)
  if (sessionUser) {
    return sessionUser
  }

  const serviceUser = getServiceUser(event)
  if (serviceUser) {
    return serviceUser
  }

  if (isAuthBypassEnabled()) {
    return await getAuthBypassUser()
  }

  throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
}

export async function getOptionalUser(event: H3Event): Promise<AuthenticatedUser | null> {
  try {
    return await requireUser(event)
  } catch {
    return null
  }
}
