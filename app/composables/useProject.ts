import type { Project } from '~~/shared/types/project'

export function useProject(projectSlug?: Ref<string>) {
  const projects = ref<Project[]>([])
  const project = ref<Project | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function fetchProjects() {
    isLoading.value = true
    error.value = null
    try {
      projects.value = await $fetch<Project[]>('/api/projects')
    } catch (err: any) {
      error.value = err.data?.message ?? 'Failed to fetch projects'
    } finally {
      isLoading.value = false
    }
  }

  async function fetchProject(slug: string) {
    isLoading.value = true
    error.value = null
    try {
      project.value = await $fetch<Project>(`/api/projects/${slug}`)
    } catch (err: any) {
      error.value = err.data?.message ?? 'Failed to fetch project'
    } finally {
      isLoading.value = false
    }
  }

  async function createProject(data: { name: string; description?: string }) {
    isLoading.value = true
    error.value = null
    try {
      const newProject = await $fetch<Project>('/api/projects', {
        method: 'POST',
        body: data,
      })
      projects.value.unshift(newProject)
      return newProject
    } catch (err: any) {
      error.value = err.data?.message ?? 'Failed to create project'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function updateProject(slug: string, data: Partial<Project>) {
    isLoading.value = true
    error.value = null
    try {
      const updated = await $fetch<Project>(`/api/projects/${slug}`, {
        method: 'PUT',
        body: data,
      })
      project.value = updated
      const idx = projects.value.findIndex((p) => p.id === updated.id)
      if (idx !== -1) projects.value[idx] = updated
      return updated
    } catch (err: any) {
      error.value = err.data?.message ?? 'Failed to update project'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function deleteProject(slug: string) {
    try {
      await $fetch(`/api/projects/${slug}`, { method: 'DELETE' })
      projects.value = projects.value.filter((p) => p.slug !== slug)
      return true
    } catch {
      return false
    }
  }

  // Auto-fetch if projectSlug is provided
  if (projectSlug) {
    watch(projectSlug, (slug) => { if (slug) fetchProject(slug) }, { immediate: true })
  }

  return {
    projects,
    project,
    isLoading,
    error,
    fetchProjects,
    fetchProject,
    createProject,
    updateProject,
    deleteProject,
  }
}
