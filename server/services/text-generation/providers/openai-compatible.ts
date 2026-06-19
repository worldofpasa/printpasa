import OpenAI from 'openai'
import type { AIProvider } from '~~/shared/types/providers'
import type { AIGenerateRequest, AIGenerateResponse } from '../types'
import { BaseAIProvider } from '../base'

export class OpenAICompatibleProvider extends BaseAIProvider {
  readonly name: AIProvider
  private client: OpenAI
  private readonly defaultModel: string
  private readonly supportsJsonMode: boolean

  constructor(
    name: AIProvider,
    apiKey: string,
    baseURL: string,
    defaultModel: string,
    options?: { supportsJsonMode?: boolean },
  ) {
    super(apiKey)
    this.name = name
    this.defaultModel = defaultModel
    this.supportsJsonMode = options?.supportsJsonMode ?? true
    this.client = new OpenAI({ apiKey, baseURL })
  }

  async generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    const messages: OpenAI.ChatCompletionMessageParam[] = []

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt })
    }
    messages.push({ role: 'user', content: request.prompt })

    const model = request.model ?? this.defaultModel
    const response = await this.client.chat.completions.create({
      model,
      messages,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.7,
      ...(request.responseFormat === 'json' && this.supportsJsonMode && {
        response_format: { type: 'json_object' },
      }),
    })

    return {
      content: response.choices[0]?.message?.content ?? '',
      provider: this.name,
      model: response.model,
      tokensUsed: response.usage?.total_tokens,
    }
  }
}
