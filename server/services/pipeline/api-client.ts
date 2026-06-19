import { ofetch } from 'ofetch'
import { getPipelineApiBaseUrl, getPipelineServiceToken } from './config'

async function pipelineFetch<T>(
  path: string,
  options?: {
    method?: string
    body?: Record<string, unknown> | unknown[]
  },
): Promise<T> {
  const base = getPipelineApiBaseUrl()
  const token = getPipelineServiceToken()
  const delays = [5000, 15000, 30000] // retry transient server errors after 5s, 15s, 30s
  let lastError: unknown
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await ofetch<T>(`${base}${path}`, {
        method: options?.method,
        body: options?.body,
        headers: { 'x-service-token': token },
      })
    } catch (err: unknown) {
      const status = (err as { status?: number; statusCode?: number }).status
        ?? (err as { status?: number; statusCode?: number }).statusCode
      const retryable = status === 503 || status === 500 || status === 502 || status === 504
      if (retryable && attempt < delays.length) {
        lastError = err
        console.warn(`[pipeline-fetch] ${status} on ${path}, retrying in ${delays[attempt]}ms (attempt ${attempt + 1})`)
        await new Promise(resolve => setTimeout(resolve, delays[attempt]))
        continue
      }
      throw err
    }
  }
  throw lastError
}

export interface CreatedProject {
  id: string
  slug: string
  name: string
}

export async function createProject(name: string, description: string) {
  return pipelineFetch<CreatedProject>('/api/projects', {
    method: 'POST',
    body: { name, description },
  })
}

import type { SourceStatus } from '~~/server/services/idea-research'

export async function generateThemes(
  projectId: string,
  opts: {
    ideaDescription: string
    count: number
  },
) {
  return pipelineFetch<{
    themes: Array<{ id: string }>
    count: number
    themeGeneration: 'success' | 'failed'
    research?: {
      title: string
      inferredAudience?: string
      signals: unknown[]
      sourceStatuses: SourceStatus[]
      warnings?: string[]
    }
  }>(
    `/api/workflow/${projectId}/gather-idea/generate`,
    {
      method: 'POST',
      body: {
        ideaDescription: opts.ideaDescription,
        count: opts.count,
      },
    },
  )
}

export async function selectThemes(projectId: string, themeIds: string[]) {
  return pipelineFetch<{ selectedCount: number }>(
    `/api/workflow/${projectId}/gather-idea/select`,
    { method: 'POST', body: { themeIds } },
  )
}

export async function setStage(projectId: string, stage: string) {
  return pipelineFetch(`/api/workflow/${projectId}/stage`, {
    method: 'PUT',
    body: { stage },
  })
}

export async function runValidation(
  projectId: string,
  opts: { winnerCount: number; useTrademarkApi?: boolean; useBrandRiskApi?: boolean },
) {
  return pipelineFetch<{
    themes: Array<{ id: string; isWinner: boolean | null }>
    validation: unknown
  }>(`/api/workflow/${projectId}/validate/run`, {
    method: 'POST',
    body: opts,
  })
}

export async function selectWinners(projectId: string, winnerIds: string[]) {
  return pipelineFetch<{ winnerCount: number }>(
    `/api/workflow/${projectId}/validate/select`,
    { method: 'POST', body: { winnerIds } },
  )
}

export async function generatePrompts(projectId: string, promptsPerTheme: number) {
  return pipelineFetch<{ count: number }>(
    `/api/workflow/${projectId}/prompts/generate`,
    { method: 'POST', body: { promptsPerTheme } },
  )
}

export async function generateImages(projectId: string) {
  return pipelineFetch<{
    images: Array<{ id: string; generationStatus: string }>
    count: number
  }>(`/api/workflow/${projectId}/images/generate`, {
    method: 'POST',
    body: { promptIds: [] },
  })
}

export async function updateImageSelection(
  projectId: string,
  imageId: string,
  isSelected: boolean,
) {
  return pipelineFetch(`/api/workflow/${projectId}/images/update`, {
    method: 'PUT',
    body: { imageId, isSelected },
  })
}
