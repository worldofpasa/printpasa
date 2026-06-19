import Anthropic from '@anthropic-ai/sdk'
import type { AIGenerateRequest, AIGenerateResponse } from '../types'
import { BaseAIProvider } from '../base'
import { DEFAULT_TEXT_MODELS } from '../defaults'

export class AnthropicProvider extends BaseAIProvider {
  readonly name = 'anthropic' as const
  private client: Anthropic
  private readonly defaultModel: string

  constructor(apiKey: string, defaultModel?: string) {
    super(apiKey)
    this.defaultModel = defaultModel ?? DEFAULT_TEXT_MODELS.anthropic
    this.client = new Anthropic({ apiKey })
  }

  async generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    const model = request.model ?? this.defaultModel
    const response = await this.client.messages.create({
      model,
      max_tokens: request.maxTokens ?? 4096,
      ...(request.systemPrompt && { system: request.systemPrompt }),
      messages: [{ role: 'user', content: request.prompt }],
    })

    const content = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')

    return {
      content,
      provider: 'anthropic',
      model: response.model,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    }
  }
}
