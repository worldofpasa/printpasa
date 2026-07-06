/**
 * Boot-time safety checks. Runs once at server startup and surfaces loud
 * warnings for insecure production configurations.
 */
export default defineNitroPlugin(() => {
  const isProd = process.env.NODE_ENV === 'production'
  const demoMode = process.env.NUXT_DEMO_MODE === 'true'
  const authDisabled = process.env.NUXT_DISABLE_AUTH === 'true'
  const signupOpen = process.env.NUXT_DISABLE_SIGNUP !== 'true'

  if (isProd && !demoMode && authDisabled) {
    console.warn(
      '\n\x1b[41m\x1b[97m SECURITY WARNING \x1b[0m '
      + '\x1b[31mNUXT_DISABLE_AUTH=true in production — all routes are unauthenticated. '
      + 'Never expose this instance to an untrusted network.\x1b[0m\n',
    )
  }

  if (isProd && !demoMode && signupOpen) {
    console.warn(
      '\x1b[33m[startup] Open signup is enabled (NUXT_DISABLE_SIGNUP is not "true"). '
      + 'On an internet-exposed instance, new users fall back to your provider API keys. '
      + 'Set NUXT_DISABLE_SIGNUP=true unless you intend open registration.\x1b[0m',
    )
  }
})
