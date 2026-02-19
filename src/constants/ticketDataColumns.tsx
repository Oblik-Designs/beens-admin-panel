import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatLabel } from '@/lib/utils'
import type { ColumnDef } from '@tanstack/react-table'
import { CalendarIcon, EllipsisVerticalIcon, UserIcon } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { Ticket } from '@/server/api/tickets'

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

const getFullName = (user?: { firstName: string; lastName: string; displayName: string }) => {
  if (!user) return 'Unknown'
  return (
    user.displayName ||
    `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() ||
    'Unknown'
  )
}

export const ticketColumns: ColumnDef<Ticket>[] = [
  {
    id: 'reporter',
    header: 'Reporter',
    cell: ({ row }) => {
      const reporter = row.original.reporter
      const name = getFullName(reporter)

      return (
        <div className="flex items-center gap-2 px-4 py-1">
          <Avatar className="size-7">
            <AvatarImage src={reporter?.profileImage} alt={name} />
            <AvatarFallback className="text-muted-foreground bg-transparent border">
              <UserIcon className="size-3.25" />
            </AvatarFallback>
          </Avatar>
          <span>{name}</span>
        </div>
      )
    },
  },
  {
    id: 'assignedTo',
    header: 'Assigned To',
    cell: ({ row }) => {
      const assignee = row.original.assignedTo
      const name = getFullName(assignee)

      return (
        <div className="flex items-center gap-2 px-4 py-1">
          <Avatar className="size-7">
            <AvatarImage src={assignee?.profileImage} alt={name} />
            <AvatarFallback className="text-muted-foreground bg-transparent border">
              <UserIcon className="size-3.25" />
            </AvatarFallback>
          </Avatar>
          <span>{name}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => formatLabel(row.original.type ?? ''),
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
    accessorKey: 'priority',
    header: 'Priority',
    cell: ({ row }) => {
      const priority = row.original.priority?.toUpperCase() ?? ''
      const priorityStyles: Record<string, string> = {
        URGENT: 'border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/50 dark:text-red-400',
        NORMAL: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
        LOW: 'border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950/50 dark:text-green-400',
        HIGH: 'border-yellow-300 bg-yellow-50 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400',
      }
      return (
        <Badge
          variant="outline"
          className={`px-1.5 flex items-center gap-1 ${priorityStyles[priority] ?? 'text-muted-foreground'}`}
        >
          {formatLabel(row.original.priority ?? '')}
        </Badge>
      )
    },
  },
  {
    id: 'reason',
    header: 'Reason',
    cell: ({ row }) => {
      const reportedTargets = (row.original as { reportedTargets?: { reason: string }[] })
        ?.reportedTargets
      const reason =
        reportedTargets
          ?.map((t) => formatLabel(t.reason))
          .filter(Boolean)
          .join(', ') || '-'
      return <span className="block max-w-55 truncate">{reason}</span>
    },
    meta: { className: 'max-w-[220px] truncate px-4' },
  },
  {
    id: 'createdAt',
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
    id: 'updatedAt',
    header: 'Updated At',
    cell: ({ row }) => {
      const value = row.original.updatedAt

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
    cell: ({ row, table }) => {
      const onViewTicketActions = (
        table.options.meta as { onViewTicketActions?: (ticket: Ticket) => void }
      )?.onViewTicketActions
      return (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="data-open:bg-muted text-muted-foreground flex size-8"
                size="icon"
              />
            }
          >
            <EllipsisVerticalIcon />
            <span className="sr-only">Open menu</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onClick={() => onViewTicketActions?.(row.original)}
            >
              Resolve / Close
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

