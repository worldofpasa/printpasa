import sharp from 'sharp'
import type { IBgRemovalProvider, BgRemovalOptions, BgRemovalResult } from '../types'

/**
 * Local background removal via @imgly/background-removal-node.
 *
 * Runs ONNX Runtime inside the same Node process — no sidecar, no API key.
 * On first call, weights (~20-60 MB) are fetched and cached to disk. Subsequent
 * calls reuse the cache. Quality is mid-tier U²-Net family; adequate for most
 * t-shirt graphics. Cloud providers (Bria, Photoroom) still win on hair/fine
 * edges — route those through the provider chain when subscriptions allow.
 *
 * Intended as the "always works, no credentials" fallback, mirroring the
 * local lanczos upscaler.
 */
export class LocalBgProvider implements IBgRemovalProvider {
    readonly name = 'local-bg' as const

    constructor(_apiKey?: string) {
        // No credentials needed; arg accepted to match factory signature.
    }

    async removeBackground(imageUrl: string, _options?: BgRemovalOptions): Promise<BgRemovalResult> {
        // Dynamic import keeps ONNX startup cost off the module-load path.
        // Fly.io / Docker installs the package at build time; fail cleanly
        // if the runtime image is missing it.
        let removeBackground: typeof import('@imgly/background-removal-node').removeBackground
        try {
            const mod = await import('@imgly/background-removal-node')
            removeBackground = mod.removeBackground
        } catch {
            throw new Error(
                'Local background removal is not available in this environment. ' +
                'Install @imgly/background-removal-node, or pick a different provider (Photoroom, Bria, Leonardo).',
            )
        }

        // Normalize input via sharp → PNG bytes → write to a temp file → pass
        // the file:// URL to imgly. Rationale:
        //   1. imgly's decoder reads the mime type off a Blob. In Nitro's
        //      bundled server context, constructing `new Blob([bytes], { type })`
        //      does not preserve `.type` reliably (empty string arrives at
        //      imageDecode → "Unsupported format:").
        //   2. Passing the S3 presigned URL directly also fails: S3 returns
        //      `application/octet-stream` which imgly's MIME detector
        //      sometimes can't resolve to an image format.
        //   3. A file:// URL bypasses both Blob-instance checks and HTTP
        //      content-type guessing: imgly's `loadFromURI` for `file:`
        //      uses `application/octet-stream` by default, which IS in its
        //      accepted list for sharp-based decoding.
        const imageRes = await fetch(imageUrl, { signal: AbortSignal.timeout(30_000) })
        if (!imageRes.ok) {
            throw new Error(`Failed to fetch source image: ${imageRes.statusText}`)
        }
        const fetchedBuffer = Buffer.from(await imageRes.arrayBuffer())
        const pngBuffer = await sharp(fetchedBuffer).png().toBuffer()

        const { writeFile, unlink, mkdtemp } = await import('node:fs/promises')
        const { join } = await import('node:path')
        const { tmpdir } = await import('node:os')
        const { pathToFileURL } = await import('node:url')
        const tmpDir = await mkdtemp(join(tmpdir(), 'local-bg-'))
        const tmpPath = join(tmpDir, 'input.png')
        await writeFile(tmpPath, pngBuffer)
        const fileUrl = pathToFileURL(tmpPath).toString()

        let resultBlob
        try {
            resultBlob = await removeBackground(fileUrl, {
                output: { format: 'image/png' },
            })
        } finally {
            await unlink(tmpPath).catch(() => {})
        }

        const outBuffer = Buffer.from(await resultBlob.arrayBuffer())
        const base64 = outBuffer.toString('base64')

        return {
            imageUrl: `data:image/png;base64,${base64}`,
            provider: 'local',
            status: 'completed',
        }
    }

    isConfigured(): boolean {
        return true
    }
}
