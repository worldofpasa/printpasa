<script setup lang="ts">
const route = useRoute()
const router = useRouter()

const showFab = computed(() => route.path !== '/projects/new')

function handleNewProject() {
  router.push('/projects/new')
}
</script>

<template>
  <Teleport to="body">
    <button
      v-if="showFab"
      type="button"
      class="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2.5 rounded-full bg-slate-950 px-5 py-4 text-sm font-semibold text-white shadow-[0_20px_50px_rgba(15,23,42,0.35)] transition-all duration-200 hover:-translate-y-1 hover:bg-slate-800 hover:shadow-[0_28px_60px_rgba(15,23,42,0.42)] active:scale-95 sm:bottom-8 sm:right-8 sm:px-6 sm:py-4 sm:text-base"
      aria-label="Create new project"
      @click="handleNewProject"
    >
      <span class="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </span>
      New Project
    </button>
  </Teleport>
</template>
