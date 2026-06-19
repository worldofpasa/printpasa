import type { ProviderModel } from './provider-registry'

/** Per-provider canonical model catalogs (source of truth for seed + UI). */
export const CANONICAL_MODELS_BY_PROVIDER: Record<string, ProviderModel[]> = {
  fal: [], // filled below
  gemini: [
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Fast default for ideas and prompts.', cost: 'Low', enabled: true },
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Higher quality reasoning.', cost: 'Medium', enabled: false },
  ],
  openai: [
    { id: 'gpt-4o', label: 'GPT-4o', description: 'Default OpenAI model.', cost: 'Medium', enabled: true },
    { id: 'gpt-4o-mini', label: 'GPT-4o mini', description: 'Cheaper structured JSON tasks.', cost: 'Low', enabled: false },
  ],
  anthropic: [
    { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', description: 'Default Anthropic model.', cost: 'Medium', enabled: true },
    { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku', description: 'Fast validation passes.', cost: 'Low', enabled: false },
  ],
  xai: [
    { id: 'grok-3-latest', label: 'Grok 3', description: 'Default xAI model.', cost: 'Medium', enabled: true },
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', description: 'Fast open-weight default on Groq.', cost: 'Low', enabled: true },
    { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant', description: 'Ultra-fast drafts.', cost: 'Very low', enabled: false },
    { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B', description: 'Long-context open model.', cost: 'Low', enabled: false },
  ],
  together: [
    { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', label: 'Llama 3.3 70B Turbo', description: 'Default Together model.', cost: 'Low', enabled: true },
    { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', label: 'Llama 3.1 8B Turbo', description: 'Fast cheap passes.', cost: 'Very low', enabled: false },
    { id: 'Qwen/Qwen2.5-72B-Instruct-Turbo', label: 'Qwen 2.5 72B', description: 'Strong open-weight alternative.', cost: 'Low', enabled: false },
  ],
  deepinfra: [
    { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct', label: 'Llama 3.1 70B', description: 'Default DeepInfra model.', cost: 'Low', enabled: true },
    { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct', label: 'Llama 3.1 8B', description: 'Fast cheap passes.', cost: 'Very low', enabled: false },
    { id: 'mistralai/Mistral-Nemo-Instruct-2407', label: 'Mistral Nemo', description: 'Compact open model.', cost: 'Very low', enabled: false },
  ],
}

/** Fal image-generation models shown in Settings + Stage 4. */
export const FAL_GENERATION_MODELS: ProviderModel[] = [
  { id: 'fal-ai/flux/dev', label: 'Flux Dev', description: 'Fast illustration generation. Default for graphic tees.', cost: '~$0.025', enabled: true },
  { id: 'fal-ai/flux/schnell', label: 'Flux Schnell', description: 'Ultra-fast drafts for prompt iteration.', cost: '~$0.003/MP', enabled: true },
  { id: 'fal-ai/recraft/v3/text-to-image', label: 'Recraft V3', description: 'Vector and flat design-style graphics.', cost: '~$0.04', enabled: true },
  { id: 'fal-ai/ideogram/v3', label: 'Ideogram V3', description: 'Short legible text in designs.', cost: '~$0.03–0.09', enabled: true },
  { id: 'fal-ai/flux-pro/v1.1', label: 'Flux Pro', description: 'Higher quality finals.', cost: '~$0.05', enabled: false },
]

CANONICAL_MODELS_BY_PROVIDER.fal = FAL_GENERATION_MODELS

/** Merge canonical catalog with stored models, preserving per-model enabled toggles. */
export function mergeProviderModels(
  canonical: ProviderModel[] | undefined,
  stored: ProviderModel[] | null | undefined,
): ProviderModel[] | undefined {
  if (!canonical?.length) return stored ?? undefined
  const enabledById = new Map((stored ?? []).map((m) => [m.id, m.enabled]))
  return canonical.map((m) => ({
    ...m,
    enabled: enabledById.has(m.id) ? (enabledById.get(m.id) ?? true) : (m.enabled ?? true),
  }))
}

/** First enabled model from registry catalog, or undefined. */
export function resolveDefaultModelFromCatalog(
  models: ProviderModel[] | null | undefined,
): string | undefined {
  const enabled = (models ?? []).filter((m) => m.enabled !== false)
  return enabled[0]?.id
}
