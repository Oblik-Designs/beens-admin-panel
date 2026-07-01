import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { format, formatDistanceToNow } from 'date-fns'
import {
    ActivityIcon,
    AlertCircleIcon,
    BellIcon,
    CheckCircle2Icon,
    ClockIcon,
    FileTextIcon,
    HandshakeIcon,
    ListFilterIcon,
    ScrollTextIcon,
    SearchIcon,
    ShieldCheckIcon,
    WalletIcon,
    WebhookIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { auditActionLabel, isKnownAuditAction } from '@/lib/audit-labels'
import { cn } from '@/lib/utils'
import type {
    AdminAuditEntry,
    TimelineActivityEvent,
    TimelineEvent,
    TimelineEventType,
    WebhookEventSummary,
} from '@/types/crisis'

/**
 * Unified timeline component for the 360 views.
 *
 * Self-contained scroll: the parent provides a flex column with a
 * known height (or `h-full` in a flex layout) and the timeline fills
 * it, scrolling only the row list. The toolbar (search + kind filter)
 * stays sticky at the top of the panel.
 *
 * Reference: admin-crisis-implementation-plan.md §4 + design plan §4.2.
 */
export interface TimelineProps {
    events: Array<TimelineEvent>
    /** Optional empty-state message. */
    emptyMessage?: string
    className?: string
}

const ICONS: Record<TimelineEventType, typeof WebhookIcon> = {
    webhook: WebhookIcon,
    transaction: WalletIcon,
    kyc: ShieldCheckIcon,
    plan_lifecycle: HandshakeIcon,
    audit: ScrollTextIcon,
    user_status: FileTextIcon,
    application: ClockIcon,
    notification: BellIcon,
    // Default for diagnostic rows; the row swaps in a check/alert icon
    // keyed on `outcome` (see TimelineRow).
    activity: ActivityIcon,
}

const KIND_LABEL: Record<TimelineEventType, string> = {
    webhook: 'Webhook',
    transaction: 'Transaction',
    kyc: 'KYC',
    plan_lifecycle: 'Plan',
    audit: 'Audit',
    user_status: 'User',
    application: 'Application',
    notification: 'Notification',
    activity: 'Activity',
}

const ALL_KINDS: Array<TimelineEventType> = [
    'webhook',
    'transaction',
    'kyc',
    'plan_lifecycle',
    'audit',
    'user_status',
    'application',
    'notification',
    'activity',
]

export function Timeline({
    events,
    emptyMessage = 'Nothing has happened on this entity yet.',
    className,
}: TimelineProps) {
    const [search, setSearch] = useState('')
    // Empty set = no filter (all kinds visible). Filtering only kicks
    // in once the operator opts into specific kinds.
    const [activeKinds, setActiveKinds] = useState<Set<TimelineEventType>>(
        new Set(),
    )

    const filtered = useMemo(() => {
        const normalisedSearch = search.trim().toLowerCase()
        return events.filter((event) => {
            if (activeKinds.size > 0 && !activeKinds.has(event.kind)) return false
            if (normalisedSearch.length === 0) return true
            return event.summary.toLowerCase().includes(normalisedSearch)
        })
    }, [events, search, activeKinds])

    const toggleKind = (kind: TimelineEventType) => {
        setActiveKinds((prev) => {
            const next = new Set(prev)
            if (next.has(kind)) next.delete(kind)
            else next.add(kind)
            return next
        })
    }

    // Per-kind counts on the unfiltered set so the menu reflects what's
    // actually available, not what's currently displayed.
    const countsByKind = useMemo(() => {
        const map = new Map<TimelineEventType, number>()
        for (const e of events) map.set(e.kind, (map.get(e.kind) ?? 0) + 1)
        return map
    }, [events])

    const activeCount = activeKinds.size
    const hasFilters = activeCount > 0 || search.length > 0

    return (
        <div className={cn('flex h-full min-h-0 flex-col', className)}>
            <div className="flex shrink-0 items-center gap-2 border-b pb-3">
                <div className="relative flex-1">
                    <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search timeline"
                        className="h-8 pl-8 text-xs"
                    />
                </div>

                <DropdownMenu modal={false}>
                    <DropdownMenuTrigger
                        render={
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 text-xs"
                            />
                        }
                    >
                        <ListFilterIcon className="size-3.5" />
                        Kinds
                        {activeCount > 0 && (
                            <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                                {activeCount}
                            </span>
                        )}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-xs">
                                Filter by kind
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {ALL_KINDS.map((kind) => {
                                const count = countsByKind.get(kind) ?? 0
                                return (
                                    <DropdownMenuCheckboxItem
                                        key={kind}
                                        checked={activeKinds.has(kind)}
                                        onCheckedChange={() => toggleKind(kind)}
                                        disabled={count === 0}
                                        className="text-xs"
                                    >
                                        <span className="flex-1">
                                            {KIND_LABEL[kind]}
                                        </span>
                                        <span className="ml-2 tabular-nums text-muted-foreground">
                                            {count}
                                        </span>
                                    </DropdownMenuCheckboxItem>
                                )
                            })}
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>

                {hasFilters && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-muted-foreground"
                        onClick={() => {
                            setSearch('')
                            setActiveKinds(new Set())
                        }}
                    >
                        Clear
                    </Button>
                )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pt-4">
                {filtered.length === 0 ? (
                    <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                        {hasFilters
                            ? `No timeline rows match — ${activeCount} kind filter${
                                  activeCount === 1 ? '' : 's'
                              }, search "${search}".`
                            : emptyMessage}
                    </div>
                ) : (
                    <ol className="relative space-y-4 border-l pl-6">
                        {filtered.map((event) => (
                            <TimelineRow key={event.id} event={event} />
                        ))}
                    </ol>
                )}
            </div>
        </div>
    )
}

/**
 * Diagnostic `activity` rows carry their timestamp as `timestamp` (flat
 * shape, no payload) whereas every other kind uses `at`.
 */
function eventTimestamp(event: TimelineEvent): string {
    return event.kind === 'activity' ? event.timestamp : event.at
}

function TimelineRow({ event }: { event: TimelineEvent }) {
    // Diagnostic rows pick their icon from the outcome so a FAILED signup /
    // plan-create reads as an alert at a glance; everything else is keyed
    // off the kind.
    const Icon =
        event.kind === 'activity'
            ? event.outcome === 'FAILED'
                ? AlertCircleIcon
                : CheckCircle2Icon
            : ICONS[event.kind]
    const iconClass = cn(
        'size-3.5 text-muted-foreground',
        event.kind === 'activity' &&
            (event.outcome === 'FAILED'
                ? 'text-red-700'
                : 'text-emerald-700'),
    )
    const timestamp = eventTimestamp(event)
    const at = new Date(timestamp)

    const body = (
        <>
            <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {KIND_LABEL[event.kind]}
                        </span>
                        <p className="truncate text-sm font-medium leading-tight">
                            {event.summary}
                        </p>
                    </div>
                </div>
                <time
                    className="shrink-0 text-[11px] text-muted-foreground"
                    dateTime={timestamp}
                    title={format(at, 'PPpp')}
                >
                    {formatDistanceToNow(at, { addSuffix: true })}
                </time>
            </div>

            <div className="mt-0.5 text-xs text-muted-foreground">
                <TimelineRowDetail event={event} />
            </div>
        </>
    )

    return (
        <li className="relative">
            <span
                className="absolute -left-[31px] flex size-6 items-center justify-center rounded-full border bg-background"
                aria-hidden="true"
            >
                <Icon className={iconClass} />
            </span>

            <EventLink event={event}>{body}</EventLink>
        </li>
    )
}

/**
 * Wrap a row in the navigation target derived from its payload, if one
 * exists. Falls back to a plain div for kinds that don't reference a
 * navigable entity (KYC, user_status, notification, plain audit rows).
 *
 * The classes mirror the look of an unwrapped row, but the link variant
 * picks up a hover affordance + pointer cursor so the operator can tell
 * it's interactive.
 */
function EventLink({
    event,
    children,
}: {
    event: TimelineEvent
    children: React.ReactNode
}) {
    const linkClass =
        'block -mx-2 rounded-md px-2 py-1 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

    switch (event.kind) {
        case 'application':
        case 'plan_lifecycle':
            return (
                <Link
                    to="/plans/$planId"
                    params={{ planId: event.payload.planId }}
                    className={linkClass}
                >
                    {children}
                </Link>
            )
        case 'transaction':
            return (
                <Link
                    to="/transactions/$transactionId"
                    params={{ transactionId: event.payload.transactionId }}
                    className={linkClass}
                >
                    {children}
                </Link>
            )
        case 'audit': {
            const { targetModel, targetId } = event.payload
            if (targetModel === 'Plan') {
                return (
                    <Link
                        to="/plans/$planId"
                        params={{ planId: targetId }}
                        className={linkClass}
                    >
                        {children}
                    </Link>
                )
            }
            if (targetModel === 'Transaction') {
                return (
                    <Link
                        to="/transactions/$transactionId"
                        params={{ transactionId: targetId }}
                        className={linkClass}
                    >
                        {children}
                    </Link>
                )
            }
            if (targetModel === 'User') {
                return (
                    <Link
                        to="/users/$userId"
                        params={{ userId: targetId }}
                        className={linkClass}
                    >
                        {children}
                    </Link>
                )
            }
            return <div>{children}</div>
        }
        case 'webhook':
            if (event.payload.linkedTransactionId) {
                return (
                    <Link
                        to="/transactions/$transactionId"
                        params={{
                            transactionId: event.payload.linkedTransactionId,
                        }}
                        className={linkClass}
                    >
                        {children}
                    </Link>
                )
            }
            return <div>{children}</div>
        case 'kyc':
        case 'user_status':
        case 'notification':
        case 'activity':
            return <div>{children}</div>
    }
}

function TimelineRowDetail({ event }: { event: TimelineEvent }) {
    switch (event.kind) {
        case 'webhook':
            return <WebhookDetail event={event.payload} />
        case 'audit':
            return <AuditDetail entry={event.payload} />
        case 'transaction':
            return (
                <span className="inline-flex flex-wrap items-baseline gap-x-2">
                    <span>
                        {event.payload.amount.toFixed(2)} {event.payload.currency}
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span>status {event.payload.status}</span>
                    {event.payload.escrowReleaseStatus && (
                        <>
                            <span className="text-muted-foreground">·</span>
                            <span>escrow {event.payload.escrowReleaseStatus}</span>
                        </>
                    )}
                    <span className="text-muted-foreground">·</span>
                    <code className="font-mono text-[11px]">
                        id {event.payload.transactionId}
                    </code>
                </span>
            )
        case 'kyc':
            return (
                <span>
                    applicant {truncate(event.payload.applicantId, 16)} · KYC{' '}
                    {event.payload.kycStatus}
                    {event.payload.sumsubReviewStatus &&
                        ` · sumsub ${event.payload.sumsubReviewStatus}`}
                </span>
            )
        case 'plan_lifecycle':
            return (
                <span>
                    {truncate(event.payload.planTitle, 32)} · {event.payload.from} →{' '}
                    {event.payload.to}
                </span>
            )
        case 'user_status':
            return (
                <span>
                    {event.payload.from} → {event.payload.to}
                    {event.payload.reason && ` · ${event.payload.reason}`}
                </span>
            )
        case 'application':
            return (
                <span>
                    {truncate(event.payload.planTitle, 32)} · {event.payload.status}
                    {event.payload.expiredReason &&
                        ` (${event.payload.expiredReason})`}
                </span>
            )
        case 'notification':
            return (
                <span>
                    {event.payload.channel} · {event.payload.title}
                </span>
            )
        case 'activity':
            return <ActivityDetail event={event} />
    }
}

function ActivityDetail({ event }: { event: TimelineActivityEvent }) {
    const failed = event.outcome === 'FAILED'

    return (
        <span className="inline-flex flex-wrap items-baseline gap-x-2">
            <span
                className={cn(
                    'text-[11px] font-medium',
                    failed ? 'text-red-700' : 'text-emerald-700',
                )}
            >
                {failed ? 'failed' : 'ok'}
            </span>
            <span className="text-muted-foreground">·</span>
            <code className="font-mono text-[11px]">{event.route}</code>
            <span className="text-muted-foreground">·</span>
            <span className="text-[11px] tabular-nums">
                status {event.status}
            </span>
            {event.reason && (
                <>
                    <span className="text-muted-foreground">·</span>
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-red-700">
                        {event.reason}
                    </code>
                </>
            )}
        </span>
    )
}

function WebhookDetail({ event }: { event: WebhookEventSummary }) {
    const verStatus = event.verification.status
    const procStatus = event.processing.status

    return (
        <span className="inline-flex flex-wrap items-baseline gap-x-2">
            <span
                className={cn(
                    'text-[11px]',
                    verStatus === 'PASSED' && 'text-emerald-700',
                    verStatus === 'FAILED' && 'text-red-700',
                    verStatus === 'SKIPPED' && 'text-amber-700',
                )}
            >
                ver {verStatus.toLowerCase()}
            </span>
            <span className="text-muted-foreground">·</span>
            <span
                className={cn(
                    'text-[11px]',
                    procStatus === 'PROCESSED' && 'text-emerald-700',
                    procStatus === 'SKIPPED' && 'text-amber-700',
                    procStatus === 'ERROR' && 'text-red-700',
                )}
            >
                {procStatus.toLowerCase()}
            </span>
            {event.processing.skipReason && (
                <>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-[11px]">{event.processing.skipReason}</span>
                </>
            )}
            {event.processing.durationMs !== null && (
                <>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-[11px] tabular-nums">
                        {event.processing.durationMs}ms
                    </span>
                </>
            )}
        </span>
    )
}

function AuditDetail({ entry }: { entry: AdminAuditEntry }) {
    const resultIcon =
        entry.result === 'APPLIED' ? (
            <CheckCircle2Icon className="size-3 text-emerald-700" />
        ) : entry.result === 'FAILED' ? (
            <AlertCircleIcon className="size-3 text-red-700" />
        ) : null

    const known = isKnownAuditAction(entry.action)
    return (
        <span className="inline-flex flex-wrap items-baseline gap-x-2">
            <span
                className={cn(
                    'text-[11px]',
                    known ? 'font-medium' : 'font-mono',
                )}
                title={known ? entry.action : undefined}
            >
                {auditActionLabel(entry.action)}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-[11px]">{entry.actorRole.toLowerCase()}</span>
            {entry.dryRun && (
                <>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-[11px]">preview</span>
                </>
            )}
            {resultIcon}
            <span className="line-clamp-1 text-[11px] italic">{entry.reason}</span>
        </span>
    )
}

function truncate(text: string, max: number) {
    if (text.length <= max) return text
    return text.slice(0, max - 1) + '…'
}
