<script setup lang="ts">
const route = useRoute()
const projectSlug = computed(() => route.params.slug as string)
const { project, isLoading } = useProject(projectSlug)

// Redirect to current stage
watch(project, (p) => {
  if (p) {
    navigateTo(`/projects/${p.slug}/stage/${p.currentStage}`)
  }
})
</script>

<template>
  <div class="flex items-center justify-center py-12">
    <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
</template>
