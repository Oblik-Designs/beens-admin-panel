import { CalendarIcon, MapPinIcon, UserIcon, UsersIcon } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type * as React from 'react'

import type { ColumnDef } from '@tanstack/react-table'
import type { Plan } from '@/server/api/plans'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

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

export const planColumns: Array<ColumnDef<Plan>> = [
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
      const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()
        if (creator && onCreatorClick) {
          onCreatorClick(creator._id)
        }
      }

      return (
        <button
          type="button"
          onClick={handleClick}
          disabled={!onCreatorClick || !creator}
          className="flex items-center gap-2 px-4 py-1 text-left hover:bg-muted/50 rounded-md transition-colors disabled:pointer-events-none disabled:opacity-100 cursor-pointer"
        >
          <Avatar className="size-7">
            <AvatarImage src={creator?.profileImage} alt={name} />
            <AvatarFallback className="text-muted-foreground bg-transparent border">
              <UserIcon className="size-3.25" />
            </AvatarFallback>
          </Avatar>
          <span
            className={
              onCreatorClick && creator ? 'underline underline-offset-2' : ''
            }
          >
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
  {
    id: 'actions',
    header: 'Actions',
    meta: { sticky: 'right' },
    cell: ({ row, table }) => {
      const meta = table.options.meta as
        | {
            onViewPlan?: (planId: string) => void
            onSuspendPlan?: (plan: Plan) => void
          }
        | undefined
      const onViewPlan = meta?.onViewPlan
      const onSuspendPlan = meta?.onSuspendPlan
      const isSuspended = row.original.status === 'Suspended'

      const handleView = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()
        if (onViewPlan) {
          onViewPlan(row.original._id)
        }
      }

      const handleSuspend = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()
        if (onSuspendPlan) {
          onSuspendPlan(row.original)
        }
      }

      return (
        <div className="flex items-center justify-start gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[11px] cursor-pointer"
            onClick={handleView}
            disabled={!onViewPlan}
          >
            View
          </Button>
          {isSuspended ? (
            <Badge
              variant="outline"
              className="h-7 px-2 text-[11px] font-medium text-destructive border-destructive/30 bg-destructive/5"
            >
              Suspended
            </Badge>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[11px] text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 cursor-pointer"
              onClick={handleSuspend}
              disabled={!onSuspendPlan}
            >
              Suspend
            </Button>
          )}
        </div>
      )
    },
  },
]
