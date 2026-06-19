import { GoogleGenAI } from '@google/genai'
import type { AIGenerateRequest, AIGenerateResponse } from '../types'
import { BaseAIProvider } from '../base'
import { DEFAULT_TEXT_MODELS } from '../defaults'

export class GeminiProvider extends BaseAIProvider {
  readonly name = 'gemini' as const
  private client: GoogleGenAI
  private readonly defaultModel: string

  constructor(apiKey: string, defaultModel?: string) {
    super(apiKey)
    this.defaultModel = defaultModel ?? DEFAULT_TEXT_MODELS.gemini
    this.client = new GoogleGenAI({ apiKey })
  }

  async generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    const isJson = request.responseFormat === 'json'
    const model = request.model ?? this.defaultModel
    const response = await this.client.models.generateContent({
      model,
      contents: request.prompt,
      config: {
        maxOutputTokens: request.maxTokens ?? 8192,
        temperature: request.temperature ?? 0.7,
        systemInstruction: request.systemPrompt,
        // Use native JSON mode when requested — guarantees valid JSON output
        // and prevents the model from wrapping the response in markdown fences
        ...(isJson && { responseMimeType: 'application/json' }),
      },
    })

    return {
      content: response.text ?? '',
      provider: 'gemini',
      model,
      tokensUsed: response.usageMetadata?.totalTokenCount,
    }
  }
}
