import {
  AlertTriangleIcon,
  CalendarIcon,
  MapPinIcon,
  UserIcon,
  UsersIcon,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { Link } from '@tanstack/react-router'
import type * as React from 'react'

import type { ColumnDef } from '@tanstack/react-table'
import type { Plan, PlanSortField } from '@/server/api/plans'
import { SortableColumnHeader } from '@/components/admin/sortable-column-header'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type PlanTableMeta = {
  onCreatorClick?: (userId: string) => void
  onViewPlan?: (planId: string) => void
  onSuspendPlan?: (plan: Plan) => void
  sortBy?: PlanSortField
  sortOrder?: 'asc' | 'desc'
  onSortChange?: (sortBy: PlanSortField, sortOrder: 'asc' | 'desc') => void
}

const formatDateTime = (value?: string) => {
  if (!value) return '-'

  let date: Date

  try {
    date = parseISO(value)
    if (Number.isNaN(date.getTime())) {
      throw new Error('Invalid ISO date')
    }
  } catch {
    const fallback = new Date(value)
    if (Number.isNaN(fallback.getTime())) return value
    date = fallback
  }

  return format(date, 'MMM dd yyyy, hh:mm a')
}

const combineDateAndTime = (date?: string, time?: string) => {
  if (!date) return undefined
  if (!time) return date
  if (date.includes('T')) return date
  return `${date}T${time}`
}

function sortableHeader(label: string, sortField: PlanSortField) {
  return ({ table }: { table: { options: { meta?: PlanTableMeta } } }) => {
    const meta = table.options.meta
    return (
      <SortableColumnHeader
        label={label}
        sortField={sortField}
        activeSortBy={meta?.sortBy}
        activeSortOrder={meta?.sortOrder}
        onSortChange={meta?.onSortChange}
      />
    )
  }
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
      const onCreatorClick = (table.options.meta as PlanTableMeta)?.onCreatorClick
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
    header: sortableHeader('Title', 'title'),
    meta: { className: 'max-w-[220px] px-4' },
    cell: ({ row, table }) => {
      const plan = row.original
      const onViewPlan = (table.options.meta as PlanTableMeta)?.onViewPlan
      const reportCount = plan.reportCount ?? 0

      return (
        <div className="flex max-w-[220px] flex-col gap-1">
          <button
            type="button"
            className="truncate text-left text-sm hover:underline"
            onClick={(event) => {
              event.stopPropagation()
              onViewPlan?.(plan._id)
            }}
          >
            {plan.title}
          </button>
          {reportCount > 0 && (
            <Link
              to="/tickets"
              search={{
                type: 'REPORT_PLAN',
                status: 'OPEN',
              }}
              className="w-fit"
              onClick={(event) => event.stopPropagation()}
            >
              <Badge
                variant="destructive"
                className="h-5 px-1.5 text-[10px] font-normal"
              >
                {reportCount} report{reportCount === 1 ? '' : 's'}
              </Badge>
            </Link>
          )}
        </div>
      )
    },
  },
  {
    id: 'kind',
    header: 'Kind',
    cell: ({ row, table }) => {
      const plan = row.original
      const onViewPlan = (table.options.meta as PlanTableMeta)?.onViewPlan

      if (plan.isRecurring) {
        return (
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="text-muted-foreground px-1.5"
            >
              Recurring
            </Badge>
            {typeof plan.instancesCount === 'number' &&
              plan.instancesCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  {plan.instancesCount} slot
                  {plan.instancesCount === 1 ? '' : 's'}
                </span>
              )}
          </div>
        )
      }

      if (plan.parentPlanId) {
        return (
          <div className="flex flex-col gap-1">
            <Badge variant="outline" className="text-muted-foreground px-1.5">
              Slot instance
            </Badge>
            {plan.parentPlan && (
              <button
                type="button"
                className="max-w-[160px] truncate text-left text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
                onClick={(event) => {
                  event.stopPropagation()
                  onViewPlan?.(plan.parentPlan!._id)
                }}
              >
                ↳ {plan.parentPlan.title}
              </button>
            )}
            {plan.timezoneMismatch && (
              <Badge
                variant="outline"
                className="h-5 gap-1 border-amber-500/40 bg-amber-500/10 px-1.5 text-[10px] text-amber-700"
              >
                <AlertTriangleIcon className="size-3" />
                TZ shift?
              </Badge>
            )}
          </div>
        )
      }

      return (
        <Badge variant="outline" className="text-muted-foreground px-1.5">
          One-off
        </Badge>
      )
    },
  },
  {
    accessorKey: 'status',
    header: sortableHeader('Status', 'status'),
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
      const plan = row.original
      const count = plan.isRecurring
        ? (plan.instanceParticipantsTotal ??
          plan.currentParticipants?.length ??
          0)
        : (plan.currentParticipants?.length ?? 0)

      return (
        <div className="flex items-center gap-1">
          <UsersIcon className="size-3 text-muted-foreground" />
          <span>{count}</span>
          {plan.isRecurring &&
            typeof plan.instanceParticipantsTotal === 'number' && (
              <span className="text-xs text-muted-foreground">
                across slots
              </span>
            )}
        </div>
      )
    },
  },
  {
    id: 'start',
    header: sortableHeader('Start Date', 'startDate'),
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
    id: 'views',
    header: sortableHeader('Views', 'views'),
    cell: ({ row }) => (
      <span className="text-xs tabular-nums">
        {(row.original.views ?? 0).toLocaleString()}
      </span>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: sortableHeader('Created', 'createdAt'),
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
      const meta = table.options.meta as PlanTableMeta
      const onViewPlan = meta?.onViewPlan
      const onSuspendPlan = meta?.onSuspendPlan
      const isSuspended = row.original.status === 'Suspended'

      const handleView = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()
        onViewPlan?.(row.original._id)
      }

      const handleSuspend = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()
        onSuspendPlan?.(row.original)
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
