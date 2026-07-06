import { signOut, useSession } from '~/lib/auth-client'

export interface AppSessionUser {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  isSuperuser?: boolean
}

export function useUserSession() {
  const config = useRuntimeConfig()
  const authDisabled = computed(() =>
    config.public.disableAuth === true || config.public.disableAuth === 'true',
  )
  const demoMode = computed(() => config.public.demoMode === true || config.public.demoMode === 'true')

  const bypassUser = useState<AppSessionUser | null>('auth-bypass-user', () => null)

  if (import.meta.client && authDisabled.value && !bypassUser.value) {
    bypassUser.value = {
      id: 'local-auth-bypass-user',
      email: 'local@printpasa.dev',
      name: 'Local Workspace',
      avatarUrl: null,
      isSuperuser: true,
    }
  }

  const session = useSession()

  const user = computed<AppSessionUser | null>(() => {
    if (authDisabled.value) {
      return bypassUser.value
    }

    // Guard against an auth client that hands back an undefined session (seen
    // with better-auth/vue on some Node versions) so a missing session degrades
    // to "logged out" instead of throwing during render.
    const s = session?.data?.value
    if (!s?.user) return null

    const u = s.user as {
      id: string
      email: string
      name: string
      image?: string | null
      role?: string
    }

    return {
      id: u.id,
      email: u.email,
      name: u.name,
      avatarUrl: u.image ?? null,
      isSuperuser: u.role === 'superuser',
    }
  })

  const loggedIn = computed(() => {
    if (authDisabled.value || demoMode.value) return true
    return !!user.value
  })

  const resolvedUser = computed<AppSessionUser | null>(() => {
    if (demoMode.value) {
      return {
        id: 'demo-viewer',
        email: 'demo@printpasa.local',
        name: 'Demo Viewer',
        avatarUrl: null,
        isSuperuser: false,
      }
    }
    if (authDisabled.value) return bypassUser.value
    return user.value
  })

  async function clear() {
    await signOut()
    await session?.refetch?.()
  }

  return {
    user: resolvedUser,
    loggedIn,
    clear,
    session,
  }
}
