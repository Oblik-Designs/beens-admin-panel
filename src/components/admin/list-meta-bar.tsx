import * as React from 'react'
import { CheckIcon, CopyIcon, LinkIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'

type ListMetaBarProps = {
  total: number
  itemLabel: string
  loadedCount?: number
  isLoading?: boolean
  presets?: Array<{ label: string; onClick: () => void }>
  onClearFilters?: () => void
  showClearWhenEmpty?: boolean
  className?: string
}

export function ListMetaBar({
  total,
  itemLabel,
  loadedCount,
  isLoading,
  presets,
  onClearFilters,
  showClearWhenEmpty,
  className,
}: ListMetaBarProps) {
  const [copied, setCopied] = React.useState(false)

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard may be unavailable
    }
  }

  if (isLoading) return null

  return (
    <div
      className={`flex flex-col gap-2 px-4 lg:flex-row lg:items-center lg:justify-between lg:px-6 ${className ?? ''}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {loadedCount != null && loadedCount < total
            ? `Showing ${loadedCount.toLocaleString()} of ${total.toLocaleString()} ${itemLabel}${total === 1 ? '' : 's'}`
            : `${total.toLocaleString()} ${itemLabel}${total === 1 ? '' : 's'} found`}
        </span>
        {total === 0 && showClearWhenEmpty && onClearFilters && (
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            onClick={onClearFilters}
          >
            Clear filters
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {presets?.map((preset) => (
          <Button
            key={preset.label}
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={preset.onClick}
          >
            {preset.label}
          </Button>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-[11px] text-muted-foreground"
          onClick={handleCopyLink}
        >
          {copied ? (
            <CheckIcon className="size-3.5 text-green-600" />
          ) : (
            <CopyIcon className="size-3.5" />
          )}
          <LinkIcon className="size-3" />
          Copy link
        </Button>
      </div>
    </div>
  )
}
