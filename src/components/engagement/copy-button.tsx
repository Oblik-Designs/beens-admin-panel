import * as React from 'react'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CopyButtonProps {
  value: string
  label?: string
  className?: string
}

/** Copies `value` to the clipboard and flips to a check for ~1.5s. Rendered as
 *  a `<button>` so `TableWithPagination`'s row-click handler ignores it. */
export function CopyButton({ value, label, className }: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false)

  const onCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard may be unavailable (insecure origin) — no-op
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={label ?? `Copy ${value}`}
      className={cn(
        'text-muted-foreground hover:text-foreground inline-flex size-6 items-center justify-center rounded transition-colors',
        className,
      )}
    >
      {copied ? (
        <CheckIcon className="size-3.5 text-emerald-500" />
      ) : (
        <CopyIcon className="size-3.5" />
      )}
    </button>
  )
}
