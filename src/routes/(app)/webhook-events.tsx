import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { RefreshCwIcon, SearchIcon } from 'lucide-react'

import type {
  ProcessingStatus,
  VerificationStatus,
  WebhookEventSummary,
} from '@/types/crisis'
import type { WebhookEventsSearchParams } from '@/server/api/crisis'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  searchWebhookEventsOptions,
  webhookEventPayloadOptions,
} from '@/queries/webhook-events'
import { WebhookEventDetailSheet } from '@/components/webhook-event-detail-sheet'

const PROVIDERS = ['XENDIT', 'SUMSUB', 'TWILIO', 'BREVO'] as const

const searchSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(25),
  provider: z.enum(PROVIDERS).optional(),
  verificationStatus: z.enum(['PASSED', 'FAILED', 'SKIPPED']).optional(),
  processingStatus: z
    .enum(['PENDING', 'PROCESSED', 'SKIPPED', 'ERROR'])
    .optional(),
  q: z.string().optional(),
  sinceMinutes: z.coerce.number().int().positive().optional(),
})

type WebhookSearch = z.infer<typeof searchSchema>

function searchToParams(s: WebhookSearch): WebhookEventsSearchParams {
  // The `q` box matches either an eventName or a provider reference id —
  // we can't know which, so prefer referenceId (the more common lookup).
  return {
    provider: s.provider,
    verificationStatus: s.verificationStatus,
    processingStatus: s.processingStatus,
    referenceId: s.q || undefined,
    sinceMinutes: s.sinceMinutes,
    page: s.page,
    limit: s.limit,
  }
}

export const Route = createFileRoute('/(app)/webhook-events')({
  validateSearch: (search) => searchSchema.parse(search),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(
      searchWebhookEventsOptions(searchToParams(deps)),
    ),
  component: WebhookEventsPage,
})

function verificationVariant(s: VerificationStatus) {
  return s === 'PASSED'
    ? 'default'
    : s === 'FAILED'
      ? 'destructive'
      : 'secondary'
}

function processingVariant(s: ProcessingStatus) {
  return s === 'PROCESSED'
    ? 'default'
    : s === 'ERROR'
      ? 'destructive'
      : s === 'SKIPPED'
        ? 'secondary'
        : 'outline'
}

function WebhookEventsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const [qInput, setQInput] = React.useState(search.q ?? '')
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )
  React.useEffect(() => setQInput(search.q ?? ''), [search.q])

  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  // Prefetch the payload as soon as a row is opened.
  useQuery(webhookEventPayloadOptions(selectedId))

  const params = searchToParams(search)
  const { data, isLoading, isFetching, refetch } = useQuery(
    searchWebhookEventsOptions(params),
  )

  const payload: any = data?.data
  const events: Array<WebhookEventSummary> = payload?.webhookEvents ?? []
  const pagination = payload?.pagination ?? {
    page: 1,
    limit: search.limit,
    totalItems: 0,
    totalPages: 1,
  }

  const update = React.useCallback(
    (patch: Partial<WebhookSearch>) => {
      navigate({ search: (prev) => ({ ...prev, ...patch, page: 1 }), replace: true })
    },
    [navigate],
  )

  const applyQ = React.useCallback(
    (value: string) => {
      setQInput(value)
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        update({ q: value || undefined })
      }, 400)
    },
    [update],
  )

  const goPage = (p: number) =>
    navigate({ search: (prev) => ({ ...prev, page: p }), replace: true })

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Webhook Events" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {/* Filters */}
              <div className="flex flex-col gap-3 px-4 lg:flex-row lg:flex-wrap lg:items-end lg:px-6">
                <div className="flex w-full max-w-xs items-center gap-2">
                  <SearchIcon className="text-muted-foreground size-4" />
                  <Input
                    placeholder="Reference id…"
                    value={qInput}
                    onChange={(e) => applyQ(e.target.value)}
                    className="h-8"
                  />
                </div>

                <FilterSelect
                  label="Provider"
                  value={search.provider ?? ''}
                  onChange={(v) =>
                    update({ provider: (v || undefined) as WebhookSearch['provider'] })
                  }
                  options={PROVIDERS.map((p) => ({ value: p, label: p }))}
                />
                <FilterSelect
                  label="Verification"
                  value={search.verificationStatus ?? ''}
                  onChange={(v) =>
                    update({
                      verificationStatus: (v || undefined) as VerificationStatus,
                    })
                  }
                  options={['PASSED', 'FAILED', 'SKIPPED'].map((p) => ({
                    value: p,
                    label: p,
                  }))}
                />
                <FilterSelect
                  label="Processing"
                  value={search.processingStatus ?? ''}
                  onChange={(v) =>
                    update({
                      processingStatus: (v || undefined) as ProcessingStatus,
                    })
                  }
                  options={['PENDING', 'PROCESSED', 'SKIPPED', 'ERROR'].map(
                    (p) => ({ value: p, label: p }),
                  )}
                />
                <FilterSelect
                  label="Window"
                  value={search.sinceMinutes ? String(search.sinceMinutes) : ''}
                  onChange={(v) =>
                    update({ sinceMinutes: v ? Number(v) : undefined })
                  }
                  options={[
                    { value: '15', label: 'Last 15m' },
                    { value: '60', label: 'Last 1h' },
                    { value: '1440', label: 'Last 24h' },
                    { value: '10080', label: 'Last 7d' },
                  ]}
                />

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => refetch()}
                >
                  <RefreshCwIcon className="mr-2 size-4" />
                  Refresh
                </Button>
              </div>

              <div className="px-4 text-xs text-muted-foreground lg:px-6">
                {isLoading
                  ? 'Loading…'
                  : `${pagination.totalItems} event${pagination.totalItems === 1 ? '' : 's'}`}
                {isFetching && !isLoading ? ' · refreshing…' : ''}
              </div>

              {/* Table */}
              <div className="px-4 lg:px-6">
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Received</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Verification</TableHead>
                        <TableHead>Processing</TableHead>
                        <TableHead>Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading &&
                        Array.from({ length: 8 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: 6 }).map((__, j) => (
                              <TableCell key={j}>
                                <Skeleton className="h-4 w-20" />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}

                      {!isLoading && events.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="py-10 text-center text-sm text-muted-foreground"
                          >
                            No webhook events match these filters.
                          </TableCell>
                        </TableRow>
                      )}

                      {!isLoading &&
                        events.map((ev) => (
                          <TableRow
                            key={ev._id}
                            className="cursor-pointer"
                            onClick={() => setSelectedId(ev._id)}
                          >
                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                              {new Date(ev.receivedAt).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{ev.provider}</Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {ev.eventName ?? '—'}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={verificationVariant(
                                  ev.verification.status,
                                )}
                              >
                                {ev.verification.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={processingVariant(ev.processing.status)}
                              >
                                {ev.processing.status}
                              </Badge>
                              {ev.processing.skipReason ? (
                                <span className="ml-2 text-[11px] text-muted-foreground">
                                  {ev.processing.skipReason}
                                </span>
                              ) : null}
                            </TableCell>
                            <TableCell className="max-w-[16rem] truncate font-mono text-xs">
                              {ev.referenceId ?? '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between py-3 text-xs text-muted-foreground">
                  <span>
                    Page {pagination.page} of {pagination.totalPages || 1}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7"
                      disabled={pagination.page <= 1}
                      onClick={() => goPage(pagination.page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7"
                      disabled={pagination.page >= (pagination.totalPages || 1)}
                      onClick={() => goPage(pagination.page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>

      <WebhookEventDetailSheet
        eventId={selectedId}
        onOpenChange={(open) => !open && setSelectedId(null)}
      />
    </SidebarProvider>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-medium text-muted-foreground">
        {label}
      </Label>
      <Select value={value} onValueChange={(v) => onChange((v ?? ''))}>
        <SelectTrigger className="h-8 w-36 text-xs">
          <SelectValue placeholder="All" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
