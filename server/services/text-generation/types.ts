import type { AIProvider } from '~~/shared/types/providers'

export interface AIGenerateRequest {
  prompt: string
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
  responseFormat?: 'text' | 'json'
  /** Overrides the instance default model for this request. */
  model?: string
}

export interface AIGenerateResponse {
  content: string
  provider: AIProvider
  tokensUsed?: number
  model?: string
}

export interface IAIProvider {
  readonly name: AIProvider
  generate(request: AIGenerateRequest): Promise<AIGenerateResponse>
  generateJSON<T>(request: AIGenerateRequest): Promise<T>
  isConfigured(): boolean
}
