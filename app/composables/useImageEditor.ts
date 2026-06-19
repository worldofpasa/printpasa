import { ref, computed, shallowRef } from 'vue'
import { floodFillMask, paintCircleMask, applyMaskTransparent, countMaskPixels } from '~/utils/flood-fill'

export type EditorTool = 'pan' | 'wand' | 'brush' | 'eraser' | 'apply'

interface Snapshot {
  source: ImageData
  mask: ImageData
}

const MAX_UNDO = 30

export function useImageEditor() {
  const sourceCanvas = shallowRef<HTMLCanvasElement | null>(null)
  const maskCanvas = shallowRef<HTMLCanvasElement | null>(null)
  const sourceCtx = shallowRef<CanvasRenderingContext2D | null>(null)
  const maskCtx = shallowRef<CanvasRenderingContext2D | null>(null)

  const width = ref(0)
  const height = ref(0)
  const fileSize = ref(0)
  const mimeType = ref('image/png')
  const ready = ref(false)
  const busy = ref(false)
  // True when the image was loaded without crossOrigin (CORS misconfigured on the
  // source). The canvas becomes tainted, so any getImageData / toBlob throws.
  // Editor tools that depend on pixel access must check this flag.
  const sourceTainted = ref(false)

  const activeTool = ref<EditorTool>('pan')
  const wandTolerance = ref(30)
  const brushRadius = ref(24)

  const zoom = ref(1)
  const pan = ref({ x: 0, y: 0 })

  const undoStack = shallowRef<Snapshot[]>([])
  const redoStack = shallowRef<Snapshot[]>([])

  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)
  const hasMask = computed(() => {
    if (!maskCtx.value || sourceTainted.value) return false
    const data = maskCtx.value.getImageData(0, 0, width.value, height.value).data
    return countMaskPixels(data) > 0
  })

  function snapshotCurrent(): Snapshot | null {
    if (!sourceCtx.value || !maskCtx.value || sourceTainted.value) return null
    return {
      source: sourceCtx.value.getImageData(0, 0, width.value, height.value),
      mask: maskCtx.value.getImageData(0, 0, width.value, height.value),
    }
  }

  function pushUndo() {
    const snap = snapshotCurrent()
    if (!snap) return
    const next = [...undoStack.value, snap]
    if (next.length > MAX_UNDO) next.shift()
    undoStack.value = next
    redoStack.value = []
  }

  function restoreSnapshot(snap: Snapshot) {
    if (!sourceCtx.value || !maskCtx.value) return
    sourceCtx.value.putImageData(snap.source, 0, 0)
    maskCtx.value.putImageData(snap.mask, 0, 0)
  }

  function undo() {
    if (undoStack.value.length === 0) return
    const current = snapshotCurrent()
    const prev = undoStack.value[undoStack.value.length - 1]!
    undoStack.value = undoStack.value.slice(0, -1)
    if (current) redoStack.value = [...redoStack.value, current]
    restoreSnapshot(prev)
  }

  function redo() {
    if (redoStack.value.length === 0) return
    const current = snapshotCurrent()
    const next = redoStack.value[redoStack.value.length - 1]!
    redoStack.value = redoStack.value.slice(0, -1)
    if (current) undoStack.value = [...undoStack.value, current]
    restoreSnapshot(next)
  }

  async function loadSource(url: string): Promise<void> {
    busy.value = true
    ready.value = false
    sourceTainted.value = false
    try {
      const { img, tainted } = await loadImage(url)
      const w = img.naturalWidth || img.width
      const h = img.naturalHeight || img.height

      const src = document.createElement('canvas')
      src.width = w
      src.height = h
      const srcCtx = src.getContext('2d', { willReadFrequently: true })
      if (!srcCtx) throw new Error('2D context unavailable')
      srcCtx.drawImage(img, 0, 0)

      const msk = document.createElement('canvas')
      msk.width = w
      msk.height = h
      const mskCtx = msk.getContext('2d', { willReadFrequently: true })
      if (!mskCtx) throw new Error('2D context unavailable')

      sourceCanvas.value = src
      sourceCtx.value = srcCtx
      maskCanvas.value = msk
      maskCtx.value = mskCtx
      width.value = w
      height.value = h
      sourceTainted.value = tainted

      // Skip file size when the canvas is tainted — toBlob would throw.
      if (!tainted) await recomputeFileSize()
      else fileSize.value = 0
      mimeType.value = 'image/png'

      undoStack.value = []
      redoStack.value = []
      zoom.value = 1
      pan.value = { x: 0, y: 0 }
      ready.value = true
    } finally {
      busy.value = false
    }
  }

  async function recomputeFileSize() {
    if (!sourceCanvas.value || sourceTainted.value) return
    const blob = await canvasToBlob(sourceCanvas.value, 'image/png')
    fileSize.value = blob.size
  }

  function runWand(x: number, y: number) {
    if (!sourceCtx.value || !maskCtx.value || sourceTainted.value) return
    const src = sourceCtx.value.getImageData(0, 0, width.value, height.value)
    const mask = maskCtx.value.getImageData(0, 0, width.value, height.value)
    pushUndo()
    floodFillMask(src.data, mask.data, width.value, height.value, Math.round(x), Math.round(y), wandTolerance.value)
    maskCtx.value.putImageData(colorizeMask(mask), 0, 0)
  }

  function paintAt(x: number, y: number, mode: 'add' | 'erase') {
    if (!maskCtx.value) return
    const mask = maskCtx.value.getImageData(0, 0, width.value, height.value)
    paintCircleMask(mask.data, width.value, height.value, Math.round(x), Math.round(y), brushRadius.value, mode)
    maskCtx.value.putImageData(colorizeMask(mask), 0, 0)
  }

  function clearMask() {
    if (!maskCtx.value) return
    maskCtx.value.clearRect(0, 0, width.value, height.value)
  }

  async function applyMask(): Promise<void> {
    if (!sourceCtx.value || !maskCtx.value || sourceTainted.value) return
    pushUndo()
    const src = sourceCtx.value.getImageData(0, 0, width.value, height.value)
    const mask = maskCtx.value.getImageData(0, 0, width.value, height.value)
    applyMaskTransparent(src.data, mask.data)
    sourceCtx.value.putImageData(src, 0, 0)
    clearMask()
    await recomputeFileSize()
  }

  async function exportPng(): Promise<Blob> {
    if (!sourceCanvas.value) throw new Error('No source loaded')
    if (sourceTainted.value) {
      throw new Error('Cannot export — image source did not allow cross-origin reads. Configure CORS on the storage bucket.')
    }
    return canvasToBlob(sourceCanvas.value, 'image/png')
  }

  return {
    // refs
    sourceCanvas, maskCanvas,
    width, height, fileSize, mimeType, ready, busy, sourceTainted,
    activeTool, wandTolerance, brushRadius,
    zoom, pan,
    canUndo, canRedo, hasMask,
    // methods
    loadSource, runWand, paintAt, clearMask, applyMask, exportPng,
    undo, redo, pushUndo,
  }
}

// ---- helpers ----

function loadImage(url: string): Promise<{ img: HTMLImageElement; tainted: boolean }> {
  // First attempt: crossOrigin='anonymous' so the canvas stays clean and tools
  // that depend on getImageData / toBlob keep working.
  return loadImageWithCors(url).then(
    (img) => ({ img, tainted: false }),
    () => loadImageNoCors(url).then((img) => ({ img, tainted: true })),
  )
}

function loadImageWithCors(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('CORS load failed'))
    img.src = url
  })
}

function loadImageNoCors(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    img.src = url
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Canvas toBlob returned null'))
    }, type)
  })
}

/**
 * The mask stores alpha-only data. Before blitting to the visible mask layer,
 * copy it into an RGBA buffer with a red tint so the user can see coverage.
 * This does not mutate the logical mask — callers still read alpha-only.
 */
function colorizeMask(mask: ImageData): ImageData {
  const data = mask.data
  const n = data.length
  for (let i = 0; i < n; i += 4) {
    const a = data[i + 3]!
    if (a > 0) {
      data[i] = 239      // tailwind red-500ish
      data[i + 1] = 68
      data[i + 2] = 68
      data[i + 3] = 102  // 40% opacity
    } else {
      data[i] = 0
      data[i + 1] = 0
      data[i + 2] = 0
      data[i + 3] = 0
    }
  }
  return mask
}
