<script setup lang="ts">
import { signIn, signUp } from '~/lib/auth-client'

definePageMeta({ layout: 'auth' })

const route = useRoute()
const config = useRuntimeConfig()

const oauthError = computed(() => route.query.error)
const googleEnabled = computed(() => config.public.googleOAuthEnabled === true)

const mode = ref<'signin' | 'signup'>('signin')
const email = ref('')
const password = ref('')
const name = ref('')
const isSubmitting = ref(false)
const formError = ref('')

async function submit() {
  if (isSubmitting.value) return
  isSubmitting.value = true
  formError.value = ''

  try {
    if (mode.value === 'signup') {
      const { error } = await signUp.email({
        email: email.value.trim(),
        password: password.value,
        name: name.value.trim() || email.value.split('@')[0],
      })
      if (error) throw new Error(error.message || 'Sign up failed')
    } else {
      const { error } = await signIn.email({
        email: email.value.trim(),
        password: password.value,
      })
      if (error) throw new Error(error.message || 'Sign in failed')
    }

    await navigateTo('/')
  } catch (e: unknown) {
    formError.value = e instanceof Error ? e.message : 'Authentication failed'
  } finally {
    isSubmitting.value = false
  }
}

async function signInWithGoogle() {
  await signIn.social({ provider: 'google', callbackURL: '/' })
}
</script>

<template>
  <div class="w-full max-w-sm space-y-6">
    <div class="space-y-2 text-center">
      <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-2xl font-bold">
        PP
      </div>
      <h1 class="text-2xl font-bold tracking-tight">Welcome to PrintPasa</h1>
      <p class="text-muted-foreground">Self-hosted AI t-shirt design pipeline</p>
    </div>

    <div v-if="oauthError" class="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
      Authentication failed. Please try again.
    </div>

    <div v-if="formError" class="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
      {{ formError }}
    </div>

    <form class="space-y-4" @submit.prevent="submit">
      <div v-if="mode === 'signup'" class="space-y-2">
        <label class="text-sm font-medium" for="name">Name</label>
        <input
          id="name"
          v-model="name"
          type="text"
          autocomplete="name"
          class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          placeholder="Your name"
        />
      </div>

      <div class="space-y-2">
        <label class="text-sm font-medium" for="email">Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          autocomplete="email"
          class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          placeholder="you@example.com"
        />
      </div>

      <div class="space-y-2">
        <label class="text-sm font-medium" for="password">Password</label>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          minlength="8"
          autocomplete="current-password"
          class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        class="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50"
        :disabled="isSubmitting"
      >
        {{ isSubmitting ? 'Please wait…' : (mode === 'signup' ? 'Create account' : 'Sign in') }}
      </button>
    </form>

    <button
      v-if="googleEnabled"
      type="button"
      class="flex w-full items-center justify-center gap-2 rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium transition-all hover:bg-muted active:scale-95"
      @click="signInWithGoogle"
    >
      Continue with Google
    </button>

    <p class="text-center text-sm text-muted-foreground">
      <button
        type="button"
        class="font-medium text-primary underline-offset-4 hover:underline"
        @click="mode = mode === 'signin' ? 'signup' : 'signin'"
      >
        {{ mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in' }}
      </button>
    </p>
  </div>
</template>
