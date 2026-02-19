import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { ColumnDef } from '@tanstack/react-table'
import { CalendarIcon, MapPinIcon, UserIcon, UsersIcon } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { Plan } from '@/server/api/plans'

const formatDateTime = (value?: string) => {
  if (!value) return '-'

  let date: Date

  try {
    // Prefer ISO parsing when possible
    date = parseISO(value)
    if (Number.isNaN(date.getTime())) {
      throw new Error('Invalid ISO date')
    }
  } catch {
    // Fallback to native Date parsing if not ISO
    const fallback = new Date(value)
    if (Number.isNaN(fallback.getTime())) return value
    date = fallback
  }

  // Explicit 12-hour format with AM/PM
  return format(date, 'MMM dd yyyy, hh:mm a')
}

const combineDateAndTime = (date?: string, time?: string) => {
  if (!date) return undefined
  if (!time) return date
  if (date.includes('T')) return date
  return `${date}T${time}`
}

export const planColumns: ColumnDef<Plan>[] = [
  {
    id: 'creator',
    header: 'Creator',
    cell: ({ row, table }) => {
      const creator = row.original.creator
      const name =
        creator?.displayName ||
        `${creator?.firstName ?? ''} ${creator?.lastName ?? ''}`.trim() ||
        'Unknown'
      const onCreatorClick = (
        table.options.meta as {
          onCreatorClick?: (userId: string) => void
        }
      )?.onCreatorClick
      const handleClick = () => creator && onCreatorClick?.(creator._id)

      return (
        <button
          type="button"
          onClick={handleClick}
          disabled={!onCreatorClick || !creator}
          className="flex items-center gap-2 px-4 py-1 text-left hover:bg-muted/50 rounded-md transition-colors disabled:pointer-events-none disabled:opacity-100"
        >
          <Avatar className="size-7">
            <AvatarImage src={creator?.profileImage} alt={name} />
            <AvatarFallback className="text-muted-foreground bg-transparent border">
              <UserIcon className="size-3.25" />
            </AvatarFallback>
          </Avatar>
          <span className={onCreatorClick && creator ? 'underline underline-offset-2' : ''}>
            {name}
          </span>
        </button>
      )
    },
  },
  {
    accessorKey: 'title',
    header: 'Title',
    meta: { className: 'max-w-[220px] truncate px-4' },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className="text-muted-foreground px-1.5 flex items-center gap-1"
      >
        {row.original.status}
      </Badge>
    ),
  },
  {
    id: 'location',
    header: 'Location',
    cell: ({ row }) => {
      const { city, state } = row.original.location || {}
      const location = [city, state].filter(Boolean).join(', ') || '-'

      return (
        <div className="flex items-center gap-1">
          <MapPinIcon className="size-3 text-muted-foreground" />
          <span>{location}</span>
        </div>
      )
    },
  },
  {
    id: 'participants',
    header: 'Current Participants',
    cell: ({ row }) => {
      const count = row.original.currentParticipants?.length ?? 0

      return (
        <div className="flex items-center gap-1">
          <UsersIcon className="size-3 text-muted-foreground" />
          <span>{count}</span>
        </div>
      )
    },
  },
  {
    id: 'start',
    header: 'Start Date',
    cell: ({ row }) => {
      const { startDate, startTime } = row.original
      const value = combineDateAndTime(startDate, startTime)

      return (
        <div className="flex items-center gap-1">
          <CalendarIcon className="size-3 text-muted-foreground" />
          <span className="text-xs">{formatDateTime(value)}</span>
        </div>
      )
    },
  },
  {
    id: 'end',
    header: 'End Date',
    cell: ({ row }) => {
      const { endDate, endTime } = row.original
      const value = combineDateAndTime(endDate, endTime)

      return (
        <div className="flex items-center gap-1">
          <CalendarIcon className="size-3 text-muted-foreground" />
          <span className="text-xs">{formatDateTime(value)}</span>
        </div>
      )
    },
  },

  {
    accessorKey: 'createdAt',
    header: 'Created At',
    cell: ({ row }) => {
      const value = row.original.createdAt

      return (
        <div className="flex items-center gap-1">
          <CalendarIcon className="size-3 text-muted-foreground" />
          <span className="text-xs">{formatDateTime(value)}</span>
        </div>
      )
    },
  },
]
