'use client'

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { XIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ImagePreviewDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  src: string
  alt: string
  /** Screen-reader label suffix, e.g. "profile photo" or "plan photo". */
  label?: string
}

export function ImagePreviewDialog({
  open,
  onOpenChange,
  src,
  alt,
  label = 'photo',
}: ImagePreviewDialogProps) {
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => onOpenChange(nextOpen)}
    >
      <DialogPrimitive.Portal keepMounted>
        <DialogPrimitive.Backdrop
          className={cn(
            'data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0',
            'fixed inset-0 z-[200] bg-black/75 supports-backdrop-filter:backdrop-blur-sm',
          )}
        />
        <DialogPrimitive.Viewport
          className={cn(
            'fixed inset-0 z-[200] flex items-center justify-center p-4',
            'data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0',
          )}
        >
          <DialogPrimitive.Popup
            className={cn(
              'data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0',
              'data-closed:zoom-out-95 data-open:zoom-in-95',
              'relative w-[min(92vw,36rem)] overflow-hidden rounded-xl bg-background p-2 shadow-2xl outline-none',
            )}
          >
            <DialogPrimitive.Title className="sr-only">
              {alt} {label}
            </DialogPrimitive.Title>
            <img
              src={src}
              alt={alt}
              className="max-h-[min(85vh,48rem)] w-full rounded-lg object-contain"
            />
            <DialogPrimitive.Close
              render={
                <Button
                  variant="secondary"
                  size="icon-sm"
                  className="absolute top-3 right-3"
                />
              }
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Viewport>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/** @deprecated Use ImagePreviewDialog */
export const ProfileImagePreviewDialog = ImagePreviewDialog
