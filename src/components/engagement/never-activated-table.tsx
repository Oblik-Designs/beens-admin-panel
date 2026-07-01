import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { formatDistanceToNow } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { TableWithPagination } from '@/components/table-with-pagination'
import { CopyButton } from '@/components/engagement/copy-button'
import { NudgeButton } from '@/components/engagement/nudge-button'
import {
  deleteUsersOptions,
  nudgeRegistrationOptions,
  searchUserOptions,
} from '@/queries/users'
import { useActorRole } from '@/lib/use-actor-role'

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
  /** Set by the nudge endpoint; drives the "already nudged" state. */
  registrationNudgedAt?: string
}

/** Mirror of the API's re-nudge cooldown so the UI can pre-mark recent nudges. */
const NUDGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000

const fullName = (u: IncompleteUser): string => {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim()
  return name || u.displayName || 'Unnamed account'
}

const phoneNumber = (u: IncompleteUser): string | null => {
  if (!u.phone) return null
  return u.countryCode ? `${u.countryCode} ${u.phone}` : u.phone
}

const isRecentlyNudged = (u: IncompleteUser): boolean => {
  if (!u.registrationNudgedAt) return false
  const t = new Date(u.registrationNudgedAt).getTime()
  return !Number.isNaN(t) && Date.now() - t < NUDGE_COOLDOWN_MS
}

export interface NeverActivatedTableProps {
  /** Forwarded so the summary card can scroll to this section. */
  id?: string
}

/**
 * The actionable list behind the "Never Activated" KPI: every `INCOMPLETE`
 * account (started signup, never finished) with the contact details an operator
 * needs to reach out. Supports multi-select for bulk "Send reminder" (queues
 * the Continue Registration email) and "Delete" (disable). Server-paginated via
 * `/user/search`.
 */
export function NeverActivatedTable({ id }: NeverActivatedTableProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const role = useActorRole()
  const canDelete = role === 'SUPERADMIN'

  const [pageIndex, setPageIndex] = React.useState(0)
  const [pageSize, setPageSize] = React.useState(10)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [bulkMsg, setBulkMsg] = React.useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = React.useState(false)

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

  // Selection is scoped to the current page, so it always maps to visible rows.
  React.useEffect(() => {
    setSelected(new Set())
  }, [pageIndex, pageSize])

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r._id))
  const someSelected = rows.some((r) => selected.has(r._id)) && !allSelected

  const toggle = (userId: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })

  const toggleAll = () =>
    setSelected(() =>
      allSelected ? new Set() : new Set(rows.map((r) => r._id)),
    )

  const clearSelection = () => setSelected(new Set())

  const nudgeMutation = useMutation({
    ...nudgeRegistrationOptions(),
    onSuccess: async (data) => {
      const results = data.results ?? []
      const sent = results.filter((r) => r.ok && r.sent).length
      const skipped = results.filter((r) => r.ok && !r.sent).length
      const failed = results.filter((r) => !r.ok).length
      setBulkMsg(
        `Queued ${sent} reminder${sent === 1 ? '' : 's'}` +
          (skipped ? ` · ${skipped} skipped (recently nudged)` : '') +
          (failed ? ` · ${failed} failed` : '') +
          '.',
      )
      clearSelection()
      await queryClient.invalidateQueries({ queryKey: ['users', 'search'] })
    },
    onError: (err: unknown) =>
      setBulkMsg(
        err instanceof Error ? err.message : 'Failed to send reminders.',
      ),
  })

  const deleteMutation = useMutation({
    ...deleteUsersOptions(),
    onSuccess: async (data) => {
      const ok = data.results.filter((r) => r.ok).length
      const failed = data.results.filter((r) => !r.ok).length
      setBulkMsg(
        `Disabled ${ok} account${ok === 1 ? '' : 's'}` +
          (failed ? ` · ${failed} failed` : '') +
          '.',
      )
      clearSelection()
      setConfirmOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err: unknown) =>
      setBulkMsg(
        err instanceof Error ? err.message : 'Failed to disable accounts.',
      ),
  })

  const onBulkNudge = () => {
    const eligible = rows
      .filter((r) => selected.has(r._id) && r.email)
      .map((r) => r._id)
    if (eligible.length === 0) {
      setBulkMsg('None of the selected accounts have an email to nudge.')
      return
    }
    setBulkMsg(null)
    nudgeMutation.mutate({ userIds: eligible })
  }

  const onBulkDelete = () => {
    const ids = rows.filter((r) => selected.has(r._id)).map((r) => r._id)
    if (ids.length === 0) return
    deleteMutation.mutate({ userIds: ids })
  }

  const columns = React.useMemo<Array<ColumnDef<IncompleteUser>>>(
    () => [
      {
        id: 'select',
        // Fixed width + forced symmetric padding (important, to beat the
        // shared table's `first-of-type:px-6` header gutter and the body's
        // `p-2`/`first:w-8`), so the header checkbox lines up with the row
        // checkboxes instead of sitting 16px to their right.
        meta: { className: 'w-12! px-4!' },
        header: () => (
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected}
            onCheckedChange={toggleAll}
            aria-label="Select all on page"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={selected.has(row.original._id)}
            onCheckedChange={() => toggle(row.original._id)}
            aria-label={`Select ${fullName(row.original)}`}
          />
        ),
      },
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
        cell: ({ row }) => (
          <NudgeButton
            userId={row.original._id}
            hasEmail={Boolean(row.original.email)}
            alreadyNudged={isRecentlyNudged(row.original)}
          />
        ),
      },
    ],
    [selected, allSelected, someSelected, rows],
  )

  const selectedCount = selected.size

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
          Newest first — reach out to recover them, or select multiple to nudge
          or remove in bulk.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {selectedCount > 0 ? (
          <div className="mb-3 flex flex-wrap items-center gap-2 border-y px-4 py-2 lg:px-6">
            <span className="text-sm font-medium">
              {selectedCount} selected
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={onBulkNudge}
              disabled={nudgeMutation.isPending}
            >
              {nudgeMutation.isPending ? 'Queuing…' : 'Send reminder'}
            </Button>
            {canDelete ? (
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmOpen(true)}
                disabled={deleteMutation.isPending}
              >
                Delete
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" onClick={clearSelection}>
              Clear
            </Button>
            {bulkMsg ? (
              <span className="text-muted-foreground text-sm">{bulkMsg}</span>
            ) : null}
          </div>
        ) : bulkMsg ? (
          <div className="mb-3 px-4 lg:px-6">
            <span className="text-muted-foreground text-sm">{bulkMsg}</span>
          </div>
        ) : null}

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

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(next) => {
          if (deleteMutation.isPending) return
          setConfirmOpen(next)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Disable {selectedCount} account(s)?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The selected accounts will be disabled and won&apos;t be able to
              sign in until reinstated. This affects {selectedCount} incomplete
              account(s).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={onBulkDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Disabling…' : 'Disable accounts'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
