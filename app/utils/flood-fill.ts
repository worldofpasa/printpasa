/**
 * 4-neighbour BFS flood fill on an RGBA pixel grid.
 * Writes alpha=255 into `mask` for every pixel whose RGB is within
 * `tolerance` (Euclidean RGB distance) of the seed color and is
 * reachable from (seedX, seedY) through like-colored neighbours.
 *
 * Does not mutate `source`. `mask` is modified in place.
 */
export function floodFillMask(
  source: Uint8ClampedArray,
  mask: Uint8ClampedArray,
  width: number,
  height: number,
  seedX: number,
  seedY: number,
  tolerance: number,
): number {
  if (seedX < 0 || seedY < 0 || seedX >= width || seedY >= height) return 0
  const seedIdx = (seedY * width + seedX) * 4
  const sr = source[seedIdx]!
  const sg = source[seedIdx + 1]!
  const sb = source[seedIdx + 2]!
  const tolSq = tolerance * tolerance

  const visited = new Uint8Array(width * height)
  const queue: number[] = [seedX, seedY]
  let filled = 0

  while (queue.length > 0) {
    const y = queue.pop()!
    const x = queue.pop()!
    const p = y * width + x
    if (visited[p]) continue
    visited[p] = 1

    const i = p * 4
    const dr = source[i]! - sr
    const dg = source[i + 1]! - sg
    const db = source[i + 2]! - sb
    if (dr * dr + dg * dg + db * db > tolSq) continue

    // Skip if already in mask.
    if (mask[i + 3]! > 0) continue

    mask[i + 3] = 255
    filled++

    if (x > 0) queue.push(x - 1, y)
    if (x < width - 1) queue.push(x + 1, y)
    if (y > 0) queue.push(x, y - 1)
    if (y < height - 1) queue.push(x, y + 1)
  }

  return filled
}

/**
 * Paint a filled circle onto a mask (alpha-only). `mode: 'add'` sets
 * alpha=255; `mode: 'erase'` sets alpha=0.
 */
export function paintCircleMask(
  mask: Uint8ClampedArray,
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
  mode: 'add' | 'erase',
): void {
  const target = mode === 'add' ? 255 : 0
  const rSq = radius * radius
  const x0 = Math.max(0, Math.floor(cx - radius))
  const x1 = Math.min(width - 1, Math.ceil(cx + radius))
  const y0 = Math.max(0, Math.floor(cy - radius))
  const y1 = Math.min(height - 1, Math.ceil(cy + radius))

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx
      const dy = y - cy
      if (dx * dx + dy * dy <= rSq) {
        const i = (y * width + x) * 4 + 3
        mask[i] = target
      }
    }
  }
}

/**
 * Zero the alpha of every pixel in `source` where `mask` has alpha > 0.
 */
export function applyMaskTransparent(
  source: Uint8ClampedArray,
  mask: Uint8ClampedArray,
): void {
  const n = source.length
  for (let i = 3; i < n; i += 4) {
    if (mask[i]! > 0) {
      source[i] = 0
    }
  }
}

/**
 * Returns the count of pixels with non-zero alpha in the mask.
 */
export function countMaskPixels(mask: Uint8ClampedArray): number {
  let count = 0
  const n = mask.length
  for (let i = 3; i < n; i += 4) {
    if (mask[i]! > 0) count++
  }
  return count
}
