import {
  AlertTriangleIcon,
  CalendarIcon,
  MapPinIcon,
  UsersIcon,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { Link } from '@tanstack/react-router'

import type { ColumnDef } from '@tanstack/react-table'
import type { Plan, PlanSortField } from '@/server/api/plans'
import { SortableColumnHeader } from '@/components/admin/sortable-column-header'
import { Badge } from '@/components/ui/badge'

type PlanTableMeta = {
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
        onSortChange={
          meta?.onSortChange as
            | ((sortBy: string, sortOrder: 'asc' | 'desc') => void)
            | undefined
        }
      />
    )
  }
}

export const planColumns: Array<ColumnDef<Plan>> = [
  {
    accessorKey: 'title',
    header: sortableHeader('Title', 'title'),
    meta: { className: 'max-w-[220px] px-4' },
    cell: ({ row }) => {
      const plan = row.original
      const reportCount = plan.reportCount ?? 0

      return (
        <div className="flex max-w-[220px] flex-col gap-1">
          <span className="truncate text-sm">{plan.title}</span>
          {reportCount > 0 && (
            <Link
              to="/tickets"
              search={
                {
                  type: 'REPORT_PLAN',
                  status: 'OPEN',
                } as never
              }
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
    cell: ({ row }) => {
      const plan = row.original

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
              <span className="max-w-[160px] truncate text-[11px] text-muted-foreground">
                ↳ {plan.parentPlan.title}
              </span>
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
    /** People-icon header — column meaning is "Number of Participants". */
    header: () => (
      <span
        className="inline-flex items-center gap-1"
        title="Number of participants"
      >
        <UsersIcon className="size-4 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">Number of participants</span>
      </span>
    ),
    cell: ({ row }) => {
      const plan = row.original
      const count = plan.isRecurring
        ? (plan.instanceParticipantsTotal ??
          plan.currentParticipants?.length ??
          0)
        : (plan.currentParticipants?.length ?? 0)

      return (
        <div className="flex items-center gap-1 tabular-nums">
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
]
