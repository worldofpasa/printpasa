import type { AIProvider } from '~~/shared/types/providers'

/** Fallback model when registry has no enabled models (preserves pre-registry behavior). */
export const DEFAULT_TEXT_MODELS: Record<AIProvider, string> = {
  gemini: 'gemini-2.5-flash',
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-20250514',
  xai: 'grok-3-latest',
  groq: 'llama-3.3-70b-versatile',
  together: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  deepinfra: 'meta-llama/Meta-Llama-3.1-70B-Instruct',
}

export const OPENAI_COMPAT_BASE_URLS: Partial<Record<AIProvider, string>> = {
  groq: 'https://api.groq.com/openai/v1',
  together: 'https://api.together.xyz/v1',
  deepinfra: 'https://api.deepinfra.com/v1/openai',
  xai: 'https://api.x.ai/v1',
}
