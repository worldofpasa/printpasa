const LEONARDO_API_BASE = 'https://cloud.leonardo.ai/api/rest/v1'

function toObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null
  return value as Record<string, unknown>
}

function toStringValue(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

export function getLeonardoApiBase() {
  return LEONARDO_API_BASE
}

export function buildLeonardoHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

function collectCandidateObjects(payload: unknown): Array<Record<string, unknown>> {
  const candidates: Array<Record<string, unknown>> = []
  const root = toObject(payload)
  if (!root) return candidates

  candidates.push(root)

  const nestedKeys = [
    'sdUpscaleJob',
    'sdUpscalerjob',
    'sdUniversalUpscalerJob',
    'universalUpscaler',
    'sdNobgJob',
    'generated_image_variation_generic',
    'generatedImageVariationGeneric',
    'uploadInitImage',
    'data',
  ] as const

  for (const key of nestedKeys) {
    const value = root[key]
    if (Array.isArray(value)) {
      for (const item of value) {
        const obj = toObject(item)
        if (obj) candidates.push(obj)
      }
      continue
    }

    const obj = toObject(value)
    if (obj) candidates.push(obj)
  }

  return candidates
}

export function extractLeonardoJobId(payload: unknown): string | null {
  const candidates = collectCandidateObjects(payload)
  const keys = ['id', 'jobId', 'job_id', 'sdUpscaleJobId', 'sdNobgJobId'] as const

  for (const candidate of candidates) {
    for (const key of keys) {
      const value = toStringValue(candidate[key])
      if (value) return value
    }
  }

  return null
}

export function extractLeonardoImageUrl(payload: unknown): string | null {
  const candidates = collectCandidateObjects(payload)
  const keys = ['url', 'imageUrl', 'upscaled_image_url', 'upscaledImageUrl'] as const

  for (const candidate of candidates) {
    for (const key of keys) {
      const value = toStringValue(candidate[key])
      if (value) return value
    }
  }

  return null
}

export function extractLeonardoStatus(payload: unknown): string | null {
  const candidates = collectCandidateObjects(payload)
  const keys = ['status', 'state'] as const

  for (const candidate of candidates) {
    for (const key of keys) {
      const value = toStringValue(candidate[key])
      if (value) return value.toLowerCase()
    }
  }

  return null
}

export async function pollLeonardoVariationImageUrl(apiKey: string, variationId: string) {
  const headers = buildLeonardoHeaders(apiKey)
  const pollIntervalMs = 2000
  const maxAttempts = 45

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await $fetch<any>(`${LEONARDO_API_BASE}/variations/${variationId}`, {
      headers,
    })

    const imageUrl = extractLeonardoImageUrl(response)
    const status = extractLeonardoStatus(response)

    if (imageUrl && (!status || ['complete', 'completed', 'finished', 'success'].includes(status))) {
      return imageUrl
    }

    if (status && ['failed', 'error', 'cancelled'].includes(status)) {
      throw new Error(`Leonardo variation failed with status: ${status}`)
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }

  throw new Error('Leonardo variation timed out after 90 seconds')
}

/**
 * Upload an arbitrary image to Leonardo as an init image.
 * Returns the Leonardo image ID that can be used with /variations endpoints.
 *
 * Flow: POST /init-image → presigned S3 URL → PUT image → return ID
 */
export async function uploadInitImageToLeonardo(
  apiKey: string,
  imageBuffer: Buffer,
  extension: string = 'png',
): Promise<string> {
  const headers = buildLeonardoHeaders(apiKey)

  // Step 1: Get presigned upload URL
  const initResponse = await $fetch<any>(`${LEONARDO_API_BASE}/init-image`, {
    method: 'POST',
    headers,
    body: { extension },
  })

  const uploadData = initResponse?.uploadInitImage ?? initResponse
  const presignedUrl = uploadData?.url
  const imageId = uploadData?.id
  const fields = uploadData?.fields ? (typeof uploadData.fields === 'string' ? JSON.parse(uploadData.fields) : uploadData.fields) : null

  if (!presignedUrl || !imageId) {
    throw new Error(`Leonardo init-image response missing url or id: ${JSON.stringify(initResponse)}`)
  }

  // Step 2: Upload image to presigned S3 URL
  const formData = new FormData()
  if (fields && typeof fields === 'object') {
    for (const [key, value] of Object.entries(fields)) {
      formData.append(key, String(value))
    }
  }
  formData.append('file', new Blob([new Uint8Array(imageBuffer)], { type: `image/${extension}` }))

  const uploadRes = await fetch(presignedUrl, {
    method: 'POST',
    body: formData,
  })

  if (!uploadRes.ok) {
    const body = await uploadRes.text().catch(() => '')
    throw new Error(`Failed to upload image to Leonardo presigned URL (${uploadRes.status}): ${body}`)
  }

  return imageId
}

export function getErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return 'Unknown Leonardo API error'

  const e = error as {
    message?: string
    data?: unknown
    response?: { _data?: unknown }
    statusMessage?: string
  }

  const data = (e.data ?? e.response?._data) as any
  if (typeof data === 'string' && data) return data
  if (data?.message && typeof data.message === 'string') return data.message
  if (data?.error && typeof data.error === 'string') return data.error

  return e.statusMessage || e.message || 'Unknown Leonardo API error'
}
