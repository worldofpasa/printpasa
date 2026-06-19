import OpenAI from 'openai'
import type { AIGenerateRequest, AIGenerateResponse } from '../types'
import { BaseAIProvider } from '../base'
import { DEFAULT_TEXT_MODELS, OPENAI_COMPAT_BASE_URLS } from '../defaults'

export class XAIProvider extends BaseAIProvider {
  readonly name = 'xai' as const
  private client: OpenAI
  private readonly defaultModel: string

  constructor(apiKey: string, defaultModel?: string) {
    super(apiKey)
    this.defaultModel = defaultModel ?? DEFAULT_TEXT_MODELS.xai
    this.client = new OpenAI({
      apiKey,
      baseURL: OPENAI_COMPAT_BASE_URLS.xai!,
    })
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
    })

    return {
      content: response.choices[0]?.message?.content ?? '',
      provider: 'xai',
      model: response.model,
      tokensUsed: response.usage?.total_tokens,
    }
  }
}
