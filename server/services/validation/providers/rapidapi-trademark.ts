import type { ITrademarkProvider, TrademarkResult } from '../types'

const RAPIDAPI_HOST = 'uspto-trademark.p.rapidapi.com'

export class RapidApiTrademarkProvider implements ITrademarkProvider {
  readonly name = 'rapidapi-uspto' as const

  constructor(private readonly apiKey: string) {
    if (!apiKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'RapidAPI key not configured for trademark validation',
      })
    }
  }

  async check(text: string, classCode = '025'): Promise<TrademarkResult> {
    const query = encodeURIComponent(text.trim())
    const url = `https://${RAPIDAPI_HOST}/v1/trademarkSearch/${query}/active`

    const res = await fetch(url, {
      headers: {
        'x-rapidapi-key': this.apiKey,
        'x-rapidapi-host': RAPIDAPI_HOST,
      },
    })

    if (!res.ok) {
      throw createError({
        statusCode: 502,
        statusMessage: `RapidAPI trademark search failed: ${res.status} ${res.statusText}`,
      })
    }

    const data = (await res.json()) as { count?: number; items?: Array<{ keyword?: string; code?: string; status_label?: string }> }
    const items = data.items ?? []

    // Restrict to requested class (025 = clothing) and live marks.
    const conflicts = items
      .filter((it) => (it.code ?? '').includes(classCode))
      .filter((it) => (it.status_label ?? '').toLowerCase().includes('live') || !it.status_label)
      .map((it) => it.keyword)
      .filter((k): k is string => typeof k === 'string' && k.length > 0)

    return {
      isSafe: conflicts.length === 0,
      conflicts: Array.from(new Set(conflicts)).slice(0, 5),
    }
  }
}
