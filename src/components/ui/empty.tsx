import * as React from 'react'

import { cn } from '@/lib/utils'

type EmptyProps = React.ComponentProps<'div'>

function Empty({ className, children, ...props }: EmptyProps) {
  return (
    <div
      data-slot="empty"
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-2 py-12 text-center text-sm text-muted-foreground',
        className,
      )}
      {...props}
    >
      {children ?? <p>No data to display.</p>}
    </div>
  )
}

function EmptyTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return (
    <h3
      data-slot="empty-title"
      className={cn('text-base font-semibold text-foreground', className)}
      {...props}
    />
  )
}

function EmptyDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="empty-description"
      className={cn('max-w-md text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

function EmptyActions({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-actions"
      className={cn(
        'mt-4 flex flex-wrap items-center justify-center gap-2',
        className,
      )}
      {...props}
    />
  )
}

export { Empty, EmptyTitle, EmptyDescription, EmptyActions }
