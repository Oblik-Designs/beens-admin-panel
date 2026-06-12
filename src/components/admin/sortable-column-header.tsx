import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'

type SortableColumnHeaderProps = {
  label: string
  sortField: string
  activeSortBy?: string
  activeSortOrder?: 'asc' | 'desc'
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void
}

export function SortableColumnHeader({
  label,
  sortField,
  activeSortBy,
  activeSortOrder,
  onSortChange,
}: SortableColumnHeaderProps) {
  if (!onSortChange) {
    return <span>{label}</span>
  }

  const isActive = activeSortBy === sortField

  const handleClick = () => {
    if (!isActive) {
      onSortChange(sortField, 'desc')
      return
    }
    onSortChange(sortField, activeSortOrder === 'desc' ? 'asc' : 'desc')
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 gap-1 px-2 text-xs font-medium hover:bg-transparent"
      onClick={handleClick}
    >
      {label}
      {isActive ? (
        activeSortOrder === 'asc' ? (
          <ArrowUpIcon className="size-3.5" />
        ) : (
          <ArrowDownIcon className="size-3.5" />
        )
      ) : (
        <ChevronsUpDownIcon className="size-3.5 text-muted-foreground" />
      )}
    </Button>
  )
}
