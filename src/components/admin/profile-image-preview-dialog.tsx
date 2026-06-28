'use client'

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { XIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ProfileImagePreviewDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  src: string
  alt: string
}

export function ProfileImagePreviewDialog({
  open,
  onOpenChange,
  src,
  alt,
}: ProfileImagePreviewDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className={cn(
            'data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0',
            'fixed inset-0 z-50 bg-black/75 supports-backdrop-filter:backdrop-blur-sm',
          )}
        />
        <DialogPrimitive.Popup
          className={cn(
            'data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0',
            'data-closed:zoom-out-95 data-open:zoom-in-95',
            'fixed top-1/2 left-1/2 z-50 w-[min(92vw,36rem)] -translate-x-1/2 -translate-y-1/2',
            'overflow-hidden rounded-xl bg-background p-2 shadow-2xl outline-none',
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            {alt} profile photo
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
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
