import { createAuthClient } from 'better-auth/vue'

export const authClient = createAuthClient({
  baseURL: '',
})

export const { signIn, signUp, signOut, useSession } = authClient
