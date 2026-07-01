'use client'

import * as React from 'react'

import { ImagePreviewDialog } from '@/components/admin/image-preview-dialog'
import { cn } from '@/lib/utils'

type ImagePreviewButtonProps = {
  src?: string | null
  alt: string
  label?: string
  children: React.ReactNode
  className?: string
  ariaLabel?: string
}

export function ImagePreviewButton({
  src,
  alt,
  label,
  children,
  className,
  ariaLabel,
}: ImagePreviewButtonProps) {
  const [open, setOpen] = React.useState(false)
  const imageSrc = src?.trim()

  if (!imageSrc) {
    return <>{children}</>
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'cursor-zoom-in transition hover:opacity-90',
          'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
          className,
        )}
        aria-label={ariaLabel ?? `View ${alt} ${label ?? 'photo'}`}
      >
        {children}
      </button>
      <ImagePreviewDialog
        open={open}
        onOpenChange={setOpen}
        src={imageSrc}
        alt={alt}
        label={label}
      />
    </>
  )
}
