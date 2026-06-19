import OpenAI from 'openai'
import type { AIGenerateRequest, AIGenerateResponse } from '../types'
import { BaseAIProvider } from '../base'
import { DEFAULT_TEXT_MODELS } from '../defaults'

export class OpenAIProvider extends BaseAIProvider {
  readonly name = 'openai' as const
  private client: OpenAI
  private readonly defaultModel: string

  constructor(apiKey: string, defaultModel?: string) {
    super(apiKey)
    this.defaultModel = defaultModel ?? DEFAULT_TEXT_MODELS.openai
    this.client = new OpenAI({ apiKey })
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
      ...(request.responseFormat === 'json' && {
        response_format: { type: 'json_object' },
      }),
    })

    return {
      content: response.choices[0]?.message?.content ?? '',
      provider: 'openai',
      model: response.model,
      tokensUsed: response.usage?.total_tokens,
    }
  }
}
