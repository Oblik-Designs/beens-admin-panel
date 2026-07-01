import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { formatDistanceToNow } from 'date-fns'
import { MailIcon, MailXIcon } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TableWithPagination } from '@/components/table-with-pagination'
import { CopyButton } from '@/components/engagement/copy-button'
import { searchUserOptions } from '@/queries/users'
import { cn } from '@/lib/utils'

/** The subset of the user record we render for follow-up. `/user/search`
 *  returns the full lean document, so everything here is available. */
interface IncompleteUser {
  _id: string
  firstName?: string
  lastName?: string
  displayName?: string
  email?: string
  phone?: string
  countryCode?: string
  isEmailVerified?: boolean
  isPhoneVerified?: boolean
  createdAt?: string
}

const fullName = (u: IncompleteUser): string => {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim()
  return name || u.displayName || 'Unnamed account'
}

const phoneNumber = (u: IncompleteUser): string | null => {
  if (!u.phone) return null
  return u.countryCode ? `${u.countryCode} ${u.phone}` : u.phone
}

const followUpMailto = (u: IncompleteUser): string => {
  const subject = encodeURIComponent('Finish setting up your Beens account')
  const body = encodeURIComponent(
    `Hi ${fullName(u) === 'Unnamed account' ? 'there' : u.firstName || 'there'},\n\n` +
      `We noticed you started creating a Beens account but didn't finish. ` +
      `Can we help you complete it?\n\n— The Beens team`,
  )
  return `mailto:${u.email}?subject=${subject}&body=${body}`
}

const columns: Array<ColumnDef<IncompleteUser>> = [
  {
    id: 'account',
    header: 'Account',
    cell: ({ row }) => {
      const u = row.original
      return (
        <div className="flex flex-col">
          <span className="font-medium">{fullName(u)}</span>
          <span className="text-muted-foreground text-xs">
            #{u._id.slice(-6)}
          </span>
        </div>
      )
    },
  },
  {
    id: 'email',
    header: 'Email',
    cell: ({ row }) => {
      const u = row.original
      if (!u.email) {
        return <span className="text-muted-foreground">—</span>
      }
      return (
        <div className="flex items-center gap-1">
          <a
            href={`mailto:${u.email}`}
            className="hover:text-primary max-w-[220px] truncate hover:underline"
            title={u.email}
          >
            {u.email}
          </a>
          {u.isEmailVerified ? (
            <Badge variant="secondary" className="ml-1">
              verified
            </Badge>
          ) : null}
          <CopyButton value={u.email} label="Copy email" />
        </div>
      )
    },
  },
  {
    id: 'phone',
    header: 'Phone',
    cell: ({ row }) => {
      const u = row.original
      const phone = phoneNumber(u)
      if (!phone) return <span className="text-muted-foreground">—</span>
      return (
        <div className="flex items-center gap-1">
          <a
            href={`tel:${phone.replace(/\s+/g, '')}`}
            className="hover:underline"
          >
            {phone}
          </a>
          {u.isPhoneVerified ? (
            <Badge variant="secondary" className="ml-1">
              verified
            </Badge>
          ) : null}
          <CopyButton value={phone} label="Copy phone" />
        </div>
      )
    },
  },
  {
    id: 'signedUp',
    header: 'Signed up',
    cell: ({ row }) => {
      const iso = row.original.createdAt
      if (!iso) return <span className="text-muted-foreground">—</span>
      const date = new Date(iso)
      if (Number.isNaN(date.getTime())) {
        return <span className="text-muted-foreground">—</span>
      }
      return (
        <span className="whitespace-nowrap" title={date.toLocaleString()}>
          {formatDistanceToNow(date, { addSuffix: true })}
        </span>
      )
    },
  },
  {
    id: 'actions',
    header: () => <span className="sr-only">Follow up</span>,
    meta: { sticky: 'right' },
    cell: ({ row }) => {
      const u = row.original
      const canEmail = Boolean(u.email)
      return (
        <a
          href={canEmail ? followUpMailto(u) : undefined}
          aria-disabled={!canEmail}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors',
            canEmail
              ? 'hover:bg-muted'
              : 'text-muted-foreground pointer-events-none opacity-50',
          )}
        >
          {canEmail ? (
            <MailIcon className="size-3.5" />
          ) : (
            <MailXIcon className="size-3.5" />
          )}
          Follow up
        </a>
      )
    },
  },
]

export interface NeverActivatedTableProps {
  /** Forwarded so the summary card can scroll to this section. */
  id?: string
}

/**
 * The actionable list behind the "Never Activated" KPI: every `INCOMPLETE`
 * account (started signup, never finished) with the contact details an
 * operator needs to reach out. Server-paginated via `/user/search`.
 */
export function NeverActivatedTable({ id }: NeverActivatedTableProps) {
  const navigate = useNavigate()
  const [pageIndex, setPageIndex] = React.useState(0)
  const [pageSize, setPageSize] = React.useState(10)

  const query = useQuery(
    searchUserOptions({
      filter: { status: 'INCOMPLETE' },
      page: pageIndex + 1,
      limit: pageSize,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }),
  )

  const payload = query.data?.data
  const rows = (payload?.users ?? []) as Array<IncompleteUser>
  const total = payload?.total ?? 0
  const pageCount =
    payload?.totalPages ?? (total ? Math.ceil(total / pageSize) : 0)

  return (
    <Card id={id} className="scroll-mt-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Never Activated Accounts
          {total > 0 ? (
            <Badge variant="secondary" className="tabular-nums">
              {total.toLocaleString()}
            </Badge>
          ) : null}
        </CardTitle>
        <CardDescription>
          Started signup but never finished (status <code>INCOMPLETE</code>).
          Newest first — reach out to recover them.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <TableWithPagination<IncompleteUser>
          data={rows}
          columns={columns}
          getRowId={(u) => u._id}
          pageIndex={pageIndex}
          pageSize={pageSize}
          pageCount={pageCount}
          onPageChange={setPageIndex}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPageIndex(0)
          }}
          isLoading={query.isFetching}
          loadingMessage="Loading accounts…"
          emptyMessage={
            query.isError
              ? 'Could not load accounts.'
              : 'No incomplete accounts — every signup finished. 🎉'
          }
          onRowClick={(u) =>
            navigate({ to: '/users/$userId', params: { userId: u._id } })
          }
        />
      </CardContent>
    </Card>
  )
}
