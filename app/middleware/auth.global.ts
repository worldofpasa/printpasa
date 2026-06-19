export default defineNuxtRouteMiddleware((to) => {
  const config = useRuntimeConfig()
  const authDisabled = config.public.disableAuth === true || config.public.disableAuth === 'true'

  if (authDisabled) {
    if (to.path === '/login') {
      return navigateTo('/')
    }
    return
  }

  const { loggedIn } = useUserSession()

  // If already logged in, redirect away from login page
  if (loggedIn.value && to.path === '/login') {
    return navigateTo('/')
  }

  // Allow access to login page and auth callbacks
  if (to.path === '/login' || to.path.startsWith('/api/auth')) {
    return
  }

  // Redirect to login if not authenticated
  if (!loggedIn.value) {
    return navigateTo('/login')
  }
})
