<script setup lang="ts">
const config = useRuntimeConfig()
const demoMode = computed(() => config.public.demoMode === true || config.public.demoMode === 'true')
</script>

<template>
  <div
    v-if="demoMode"
    class="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950"
  >
    <strong>Demo mode</strong> — read-only showcase.
    <a
      :href="config.public.docsUrl"
      class="ml-1 font-semibold underline underline-offset-2"
      target="_blank"
      rel="noopener"
    >Self-host PrintPasa</a>
    to run the full pipeline.
  </div>
</template>
