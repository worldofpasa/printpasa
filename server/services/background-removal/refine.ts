import sharp from 'sharp'

const DEFAULT_TOLERANCE = 30
const ALPHA_TRANSPARENT_THRESHOLD = 10

/**
 * Post-process a bg-removed PNG by flood-filling transparent from any corner
 * that is still opaque. Catches the common failure where a segmentation model
 * treats a uniform-colored canvas (typical on AI-generated illustrations) as
 * part of the subject and leaves a rectangular frame of cream/white pixels.
 *
 * Safe properties:
 *   - If all four corners are already ≤10 alpha, returns input unchanged
 *     (the provider produced a clean cutout; no processing needed).
 *   - Flood fill is seeded ONLY from opaque corners and spreads only to
 *     connected pixels within `tolerance` RGB distance of the corner color,
 *     so an isolated same-color pixel inside the design is preserved.
 *   - `tolerance` defaults to 30 out of 255 (~12% colour-space radius) — tight
 *     enough to leave design details alone, loose enough to catch moderate
 *     JPEG-like color bleed at edges.
 *
 * Returns a new PNG buffer when the image was modified; otherwise returns the
 * input buffer untouched (caller can short-circuit S3 re-upload if needed).
 */
export async function refineBorders(pngBuffer: Buffer, tolerance: number = DEFAULT_TOLERANCE): Promise<Buffer> {
  const { data, info } = await sharp(pngBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height, channels } = info
  if (channels !== 4 || width === 0 || height === 0) return pngBuffer

  const corners: Array<[number, number]> = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ]

  const anyOpaqueCorner = corners.some(([x, y]) => {
    const idx = (y * width + x) * 4
    return data[idx + 3]! > ALPHA_TRANSPARENT_THRESHOLD
  })
  if (!anyOpaqueCorner) return pngBuffer

  const visited = new Uint8Array(width * height)
  let cleared = 0

  for (const [cx, cy] of corners) {
    const cIdx = (cy * width + cx) * 4
    if (data[cIdx + 3]! <= ALPHA_TRANSPARENT_THRESHOLD) continue

    const r0 = data[cIdx]!
    const g0 = data[cIdx + 1]!
    const b0 = data[cIdx + 2]!

    const stack: Array<[number, number]> = [[cx, cy]]
    while (stack.length > 0) {
      const [x, y] = stack.pop()!
      if (x < 0 || x >= width || y < 0 || y >= height) continue
      const flat = y * width + x
      if (visited[flat]) continue
      visited[flat] = 1

      const i = flat * 4
      if (data[i + 3]! <= ALPHA_TRANSPARENT_THRESHOLD) continue

      const dr = data[i]! - r0
      const dg = data[i + 1]! - g0
      const db = data[i + 2]! - b0
      if (dr * dr + dg * dg + db * db > tolerance * tolerance) continue

      data[i + 3] = 0
      cleared++
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
    }
  }

  if (cleared === 0) return pngBuffer
  return sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer()
}
