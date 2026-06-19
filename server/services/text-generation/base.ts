import type { AIProvider } from '~~/shared/types/providers'
import type { AIGenerateRequest, AIGenerateResponse, IAIProvider } from './types'

export abstract class BaseAIProvider implements IAIProvider {
  abstract readonly name: AIProvider
  protected apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  abstract generate(request: AIGenerateRequest): Promise<AIGenerateResponse>

  async generateJSON<T>(request: AIGenerateRequest): Promise<T> {
    const response = await this.generate({
      ...request,
      responseFormat: 'json',
      systemPrompt: request.systemPrompt
        ? `${request.systemPrompt}\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no code fences, no explanation.`
        : 'Respond ONLY with valid JSON. No markdown, no code fences, no explanation.',
    })

    const cleaned = response.content
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim()

    return JSON.parse(cleaned) as T
  }

  isConfigured(): boolean {
    return !!this.apiKey
  }
}
