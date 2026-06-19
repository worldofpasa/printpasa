<script setup lang="ts">
const route = useRoute()
const config = useRuntimeConfig()
const { user, clear: logout } = useUserSession()

const navItems = computed(() => {
  const items = [
    { label: 'Dashboard', to: '/' },
    { label: 'Settings', to: '/settings' },
  ]
  if (user.value?.isSuperuser) {
    items.push({ label: 'Audit Logs', to: '/audit-logs' })
  }
  return items
})

const userInitial = computed(() => user.value?.name?.charAt(0)?.toUpperCase() ?? 'P')
const isProjectRoute = computed(() => route.path.startsWith('/projects/'))
const authDisabled = computed(() => config.public.disableAuth === true || config.public.disableAuth === 'true')
</script>

<template>
  <div class="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.16),_transparent_28%),linear-gradient(180deg,#fffdf6_0%,#f7f3ea_48%,#f3efe6_100%)] text-slate-950">
    <div class="absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top_right,_rgba(15,23,42,0.09),_transparent_32%)]" />

    <DemoModeBanner />

    <header class="sticky top-0 z-50 border-b border-black/10 bg-[#fffaf0]/90 backdrop-blur-xl">
      <div class="mx-auto flex max-w-[90rem] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex items-center gap-4">
            <NuxtLink to="/" class="group flex items-center gap-3">
              <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black tracking-[0.2em] text-white shadow-[0_12px_28px_rgba(15,23,42,0.22)] transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-[1.03]">
                PP
              </div>
              <div class="space-y-0.5">
                <p class="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">Print workflow</p>
                <p class="font-serif text-2xl font-semibold tracking-tight text-slate-950">PrintPasa</p>
              </div>
            </NuxtLink>

            <nav class="hidden items-center gap-2 rounded-full border border-black/10 bg-white/80 p-1 shadow-[0_10px_35px_rgba(15,23,42,0.08)] md:flex">
              <NuxtLink
                v-for="item in navItems"
                :key="item.to"
                :to="item.to"
                class="rounded-full px-4 py-2 text-sm font-medium text-slate-500 transition-all duration-200 hover:bg-slate-950/5 hover:text-slate-950"
                active-class="bg-slate-950 text-white shadow-[0_12px_24px_rgba(15,23,42,0.18)]"
              >
                {{ item.label }}
              </NuxtLink>
            </nav>
          </div>

          <div class="flex items-center justify-between gap-3 sm:justify-end">
            <div v-if="isProjectRoute" class="hidden rounded-full border border-amber-900/10 bg-amber-50/80 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-amber-900/70 md:flex">
              Active workflow
            </div>

            <div v-if="user" class="flex items-center gap-3 rounded-[1.5rem] border border-black/10 bg-white/85 px-3 py-2 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
              <div class="hidden text-right sm:block">
                <p class="text-sm font-semibold text-slate-900">{{ user.name }}</p>
                <p class="text-xs uppercase tracking-[0.18em] text-slate-500">Workspace owner</p>
              </div>

              <div class="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-black/10 bg-slate-950/5 text-sm font-semibold text-slate-700">
                <img
                  v-if="user.avatarUrl"
                  :src="user.avatarUrl"
                  :alt="user.name"
                  class="h-full w-full object-cover"
                />
                <span v-else>{{ userInitial }}</span>
              </div>

              <button
                v-if="!authDisabled"
                class="rounded-full border border-black/10 bg-slate-950 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white transition-transform duration-200 hover:scale-[1.02] hover:bg-slate-800"
                @click="logout()"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>

        <nav class="flex gap-2 overflow-x-auto pb-1 md:hidden">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="shrink-0 rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 transition-all duration-200"
            active-class="border-slate-950 bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)]"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>
      </div>
    </header>

    <main class="mx-auto max-w-[90rem] px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-8 lg:pb-28">
      <slot />
    </main>

    <NewProjectFab />
  </div>
</template>
