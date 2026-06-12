import { XIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export type FilterChip = {
  id: string
  label: string
  onRemove: () => void
}

type FilterChipsProps = {
  chips: Array<FilterChip>
  className?: string
}

export function FilterChips({ chips, className }: FilterChipsProps) {
  if (chips.length === 0) return null

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className ?? ''}`}>
      {chips.map((chip) => (
        <Badge
          key={chip.id}
          variant="secondary"
          className="h-6 gap-1 pr-1 text-[11px] font-normal"
        >
          {chip.label}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-4 hover:bg-transparent"
            onClick={chip.onRemove}
            aria-label={`Remove ${chip.label}`}
          >
            <XIcon className="size-3" />
          </Button>
        </Badge>
      ))}
    </div>
  )
}
