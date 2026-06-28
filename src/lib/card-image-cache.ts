type CacheEntry = {
  displaySrc: string
  status: 'loading' | 'ready' | 'failed'
}

const entries = new Map<string, CacheEntry>()
const subscribersByUrl = new Map<string, Set<() => void>>()
const paintedUrls = new Set<string>()
const lockedSrcByUrl = new Map<string, string>()
const bitmapByUrl = new Map<string, ImageBitmap>()
const bitmapLoading = new Map<string, Promise<void>>()

const DISPLAY_BITMAP_MAX = 480

function notifyUrl(url: string) {
  const subscribers = subscribersByUrl.get(url)
  if (!subscribers) return
  for (const subscriber of subscribers) {
    subscriber()
  }
}

export function subscribeCardImageCache(url: string, onStoreChange: () => void) {
  let subscribers = subscribersByUrl.get(url)
  if (!subscribers) {
    subscribers = new Set()
    subscribersByUrl.set(url, subscribers)
  }
  subscribers.add(onStoreChange)
  return () => subscribers!.delete(onStoreChange)
}

export function getCardImageDisplaySrc(url: string) {
  return entries.get(url)?.displaySrc ?? url
}

export function isCardImageReady(url: string) {
  const entry = entries.get(url)
  return entry?.status === 'ready' || entry?.status === 'failed'
}

export function wasImagePainted(url: string) {
  return paintedUrls.has(url)
}

export function getImageBitmap(url: string) {
  return bitmapByUrl.get(url) ?? null
}

export function getStableImageSrc(url: string) {
  const locked = lockedSrcByUrl.get(url)
  if (locked) return locked
  if (isCardImageReady(url)) return getCardImageDisplaySrc(url)
  return url
}

export function lockImageSrc(url: string, src: string) {
  if (!lockedSrcByUrl.has(url)) {
    lockedSrcByUrl.set(url, src)
  }
  if (!paintedUrls.has(url)) {
    paintedUrls.add(url)
    notifyUrl(url)
  }
}

function markReady(url: string, displaySrc: string) {
  entries.set(url, { displaySrc, status: 'ready' })
  notifyUrl(url)
}

function markFailed(url: string) {
  entries.set(url, { displaySrc: url, status: 'failed' })
  notifyUrl(url)
}

async function downscaleBitmap(bitmap: ImageBitmap): Promise<ImageBitmap> {
  const maxDim = DISPLAY_BITMAP_MAX
  if (bitmap.width <= maxDim && bitmap.height <= maxDim) {
    return bitmap
  }

  const scale = maxDim / Math.max(bitmap.width, bitmap.height)
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  return createImageBitmap(bitmap, {
    resizeWidth: width,
    resizeHeight: height,
    resizeQuality: 'high',
  })
}

async function storeBitmap(url: string, bitmap: ImageBitmap, displaySrc: string) {
  const existing = bitmapByUrl.get(url)
  if (existing) {
    existing.close()
  }

  const display = await downscaleBitmap(bitmap)
  bitmapByUrl.set(url, display)
  markReady(url, displaySrc)
  lockImageSrc(url, displaySrc)
}

async function loadBitmapFromBlob(url: string, blob: Blob) {
  const bitmap = await createImageBitmap(blob)
  const displaySrc = URL.createObjectURL(blob)
  await storeBitmap(url, bitmap, displaySrc)
}

async function loadBitmapFromImage(url: string, img: HTMLImageElement) {
  const bitmap = await createImageBitmap(img)
  await storeBitmap(url, bitmap, url)
}

async function loadBitmap(url: string) {
  try {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' })
    if (response.ok) {
      await loadBitmapFromBlob(url, await response.blob())
      return
    }
  } catch {
    // fall through to Image() loader
  }

  await new Promise<void>((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.decoding = 'async'

    img.onload = () => {
      void loadBitmapFromImage(url, img)
        .catch(() => markFailed(url))
        .finally(resolve)
    }

    img.onerror = () => {
      markFailed(url)
      resolve()
    }

    img.src = url
  })
}

/** Decode once into an in-memory ImageBitmap for synchronous scroll-back paint. */
export function ensureImageBitmapCached(url: string) {
  if (bitmapByUrl.has(url)) return
  if (bitmapLoading.has(url)) return

  entries.set(url, { displaySrc: url, status: 'loading' })
  notifyUrl(url)

  const promise = loadBitmap(url).finally(() => {
    bitmapLoading.delete(url)
  })

  bitmapLoading.set(url, promise)
}

/** @deprecated Use ensureImageBitmapCached */
export function ensureCardImageCached(url: string) {
  ensureImageBitmapCached(url)
}

export function collectCardImageUrls(urls: Array<string | null | undefined>) {
  const unique = new Set<string>()
  for (const url of urls) {
    const trimmed = url?.trim()
    if (trimmed) unique.add(trimmed)
  }
  return [...unique]
}

export type ObjectPosition = { x: number; y: number }

export function parseObjectPosition(value: string): ObjectPosition {
  const parts = value.trim().split(/\s+/)
  return {
    x: parsePositionPart(parts[0] ?? 'center', 'x'),
    y: parsePositionPart(parts[1] ?? parts[0] ?? 'center', 'y'),
  }
}

function parsePositionPart(part: string, axis: 'x' | 'y'): number {
  if (part === 'center') return 0.5
  if (part.endsWith('%')) {
    const value = Number.parseFloat(part)
    return Number.isFinite(value) ? value / 100 : 0.5
  }
  if (axis === 'x') {
    if (part === 'left') return 0
    if (part === 'right') return 1
  } else {
    if (part === 'top') return 0
    if (part === 'bottom') return 1
  }
  return 0.5
}

/** object-fit: cover draw for canvas — same visual as CSS object-cover. */
export function drawImageCover(
  context: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  destWidth: number,
  destHeight: number,
  position: ObjectPosition,
) {
  const scale = Math.max(destWidth / bitmap.width, destHeight / bitmap.height)
  const drawWidth = bitmap.width * scale
  const drawHeight = bitmap.height * scale
  const offsetX = (destWidth - drawWidth) * position.x
  const offsetY = (destHeight - drawHeight) * position.y
  context.drawImage(bitmap, offsetX, offsetY, drawWidth, drawHeight)
}
