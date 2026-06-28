'use client'

import * as React from 'react'
import { useLayoutEffect, useSyncExternalStore } from 'react'

import {
  drawImageCover,
  ensureImageBitmapCached,
  getImageBitmap,
  parseObjectPosition,
  subscribeCardImageCache,
} from '@/lib/card-image-cache'
import { cn } from '@/lib/utils'

type CachedCardImageProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'children'
> & {
  src: string
  alt?: string
  objectPosition?: string
}

function useImageBitmap(src: string) {
  return useSyncExternalStore(
    (onStoreChange) => subscribeCardImageCache(src, onStoreChange),
    () => getImageBitmap(src),
    () => null,
  )
}

function paintBitmapToCanvas(
  container: HTMLDivElement,
  canvas: HTMLCanvasElement,
  bitmap: ImageBitmap,
  objectPosition: string,
) {
  const { width, height } = container.getBoundingClientRect()
  if (width <= 0 || height <= 0) return

  const dpr = window.devicePixelRatio || 1
  const pixelWidth = Math.round(width * dpr)
  const pixelHeight = Math.round(height * dpr)

  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth
    canvas.height = pixelHeight
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
  }

  const context = canvas.getContext('2d')
  if (!context) return

  context.setTransform(dpr, 0, 0, dpr, 0, 0)
  context.clearRect(0, 0, width, height)
  drawImageCover(
    context,
    bitmap,
    width,
    height,
    parseObjectPosition(objectPosition),
  )
}

/**
 * Feed-style image: decoded pixels live in an ImageBitmap cache and paint
 * synchronously to canvas on scroll-back (no img decode / white flash).
 */
export const CachedCardImage = React.memo(function CachedCardImage({
  src,
  className,
  alt = '',
  objectPosition = 'center center',
  ...props
}: CachedCardImageProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const bitmap = useImageBitmap(src)

  useLayoutEffect(() => {
    ensureImageBitmapCached(src)
  }, [src])

  useLayoutEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!bitmap || !container || !canvas) return

    paintBitmapToCanvas(container, canvas, bitmap, objectPosition)

    const observer = new ResizeObserver(() => {
      if (!containerRef.current || !canvasRef.current) return
      paintBitmapToCanvas(
        containerRef.current,
        canvasRef.current,
        bitmap,
        objectPosition,
      )
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [bitmap, objectPosition, src])

  return (
    <div
      ref={containerRef}
      aria-label={alt || undefined}
      role={alt ? 'img' : undefined}
      className={cn(
        'absolute inset-0 overflow-hidden [transform:translateZ(0)] [backface-visibility:hidden]',
        !bitmap && 'bg-muted animate-pulse',
        className,
      )}
      {...props}
    >
      {bitmap ? (
        <canvas
          ref={canvasRef}
          className="block size-full"
        />
      ) : null}
    </div>
  )
}, (prev, next) =>
  prev.src === next.src && prev.objectPosition === next.objectPosition,
)
