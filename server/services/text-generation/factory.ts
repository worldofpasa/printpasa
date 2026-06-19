import type { AIProvider } from '~~/shared/types/providers'
import type { IAIProvider } from './types'
import { DEFAULT_TEXT_MODELS, OPENAI_COMPAT_BASE_URLS } from './defaults'
import { GeminiProvider } from './providers/gemini'
import { OpenAIProvider } from './providers/openai'
import { AnthropicProvider } from './providers/anthropic'
import { XAIProvider } from './providers/xai'
import { OpenAICompatibleProvider } from './providers/openai-compatible'

const NATIVE_PROVIDER_MAP: Partial<Record<AIProvider, new (apiKey: string, defaultModel?: string) => IAIProvider>> = {
  gemini: GeminiProvider,
  openai: OpenAIProvider,
  anthropic: AnthropicProvider,
  xai: XAIProvider,
}

const OPENAI_COMPAT_PROVIDERS: AIProvider[] = ['groq', 'together', 'deepinfra']

export function createAIProvider(
  provider: AIProvider | string,
  apiKey: string,
  model?: string,
  baseURL?: string
): IAIProvider {
  const defaultModel = model || (DEFAULT_TEXT_MODELS as any)[provider] || ''

  if (provider in NATIVE_PROVIDER_MAP) {
    const ProviderClass = NATIVE_PROVIDER_MAP[provider as keyof typeof NATIVE_PROVIDER_MAP]
    if (ProviderClass) return new ProviderClass(apiKey, defaultModel)
  }

  // If explicit baseURL is provided (via UI/DB configuration)
  if (baseURL) {
    return new OpenAICompatibleProvider(provider as AIProvider, apiKey, baseURL, defaultModel)
  }

  // Fallback to hardcoded URL for known OpenAI-compatible providers
  if (OPENAI_COMPAT_PROVIDERS.includes(provider as AIProvider)) {
    const defaultBaseURL = OPENAI_COMPAT_BASE_URLS[provider as AIProvider]
    if (defaultBaseURL) {
      return new OpenAICompatibleProvider(provider as AIProvider, apiKey, defaultBaseURL, defaultModel)
    }
  }

  console.error(`[ai-factory] Unknown provider or missing baseURL: ${provider}`)
  throw new Error(`Unknown AI provider: ${provider}`)
}


