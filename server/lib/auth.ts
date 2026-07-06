import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { useDB, schema } from '../database'

let _auth: ReturnType<typeof betterAuth> | null = null

export function getAuth() {
  if (_auth) return _auth

  const config = useRuntimeConfig()
  const googleClientId = process.env.NUXT_OAUTH_GOOGLE_CLIENT_ID?.trim()
  const googleClientSecret = process.env.NUXT_OAUTH_GOOGLE_CLIENT_SECRET?.trim()
  const baseURL = (config.public.appUrl as string) || 'http://localhost:3000'
  const configuredSecret = ((config.sessionPassword as string) || process.env.NUXT_SESSION_PASSWORD || '').trim()
  const isProd = process.env.NODE_ENV === 'production'
  const demoMode = process.env.NUXT_DEMO_MODE === 'true'
  if (isProd && !demoMode && configuredSecret.length < 32) {
    throw new Error(
      'NUXT_SESSION_PASSWORD must be set to a random string of at least 32 characters in production. '
      + 'Generate one with: openssl rand -base64 32',
    )
  }
  // Dev-only fallback so `pnpm dev` works with no config. Never reached in production (guarded above).
  const secret = configuredSecret || 'dev-secret-min-32-characters-long!!'

  const socialProviders: Record<string, { clientId: string, clientSecret: string }> = {}
  if (googleClientId && googleClientSecret) {
    socialProviders.google = {
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }
  }

  const disableSignUp = process.env.NUXT_DISABLE_SIGNUP === 'true'

  _auth = betterAuth({
    database: drizzleAdapter(useDB(), {
      provider: 'sqlite',
      schema: {
        user: schema.users,
        session: schema.authSessions,
        account: schema.authAccounts,
        verification: schema.authVerifications,
      },
    }),
    baseURL,
    secret,
    trustedOrigins: [baseURL],
    emailAndPassword: {
      enabled: true,
      disableSignUp,
    },
    ...(Object.keys(socialProviders).length > 0 ? { socialProviders } : {}),
    user: {
      additionalFields: {
        role: {
          type: 'string',
          required: false,
          defaultValue: 'user',
          input: false,
        },
      },
    },
  })

  return _auth
}
