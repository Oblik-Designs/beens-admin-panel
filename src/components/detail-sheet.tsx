'use client'

import * as React from 'react'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

export type DetailSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  className?: string
}

export function DetailSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  side = 'right',
  className,
}: DetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={
          className ??
          'min-w-130 border-l bg-background/95 px-6 py-6 gap-0 backdrop-blur sm:max-w-xl sm:px-8 sm:py-8'
        }
      >
        <SheetHeader className="p-0 py-6">
          <SheetTitle className="text-base sm:text-lg">{title}</SheetTitle>
          {description && (
            <SheetDescription className="text-xs sm:text-sm">
              {description}
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="flex flex-col gap-6">{children}</div>

        {footer && (
          <SheetFooter className="mt-2 gap-2 pt-4 sm:gap-3">
            {footer}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
