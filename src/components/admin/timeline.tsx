import { format, formatDistanceToNow } from 'date-fns'
import {
    AlertCircleIcon,
    BellIcon,
    CheckCircle2Icon,
    ClockIcon,
    FileTextIcon,
    HandshakeIcon,
    ScrollTextIcon,
    ShieldCheckIcon,
    WalletIcon,
    WebhookIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import type {
    AdminAuditEntry,
    TimelineEvent,
    TimelineEventType,
    WebhookEventSummary,
} from '@/types/crisis'

/**
 * Unified timeline component for the 360 views. Renders a chronological
 * feed of every source that touches an entity: webhooks, transactions,
 * KYC events, plan lifecycle, audit entries, user status changes,
 * application state changes, notifications.
 *
 * Each row renders a kind-specific icon + summary, plus optional
 * structured detail (e.g. webhook verification badge, audit `before/after`).
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
}

export function Timeline({
    events,
    emptyMessage = 'Nothing has happened on this entity yet.',
    className,
}: TimelineProps) {
    if (events.length === 0) {
        return (
            <div
                className={cn(
                    'flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground',
                    className,
                )}
            >
                {emptyMessage}
            </div>
        )
    }

    return (
        <ol className={cn('relative space-y-4 border-l pl-6', className)}>
            {events.map((event) => (
                <TimelineRow key={event.id} event={event} />
            ))}
        </ol>
    )
}

function TimelineRow({ event }: { event: TimelineEvent }) {
    const Icon = ICONS[event.kind]
    const at = new Date(event.at)

    return (
        <li className="relative">
            <span
                className="absolute -left-[31px] flex size-6 items-center justify-center rounded-full border bg-background"
                aria-hidden="true"
            >
                <Icon className="size-3.5 text-muted-foreground" />
            </span>

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
                    dateTime={event.at}
                    title={format(at, "PPpp")}
                >
                    {formatDistanceToNow(at, { addSuffix: true })}
                </time>
            </div>

            <div className="mt-0.5 text-xs text-muted-foreground">
                <TimelineRowDetail event={event} />
            </div>
        </li>
    )
}

function TimelineRowDetail({ event }: { event: TimelineEvent }) {
    switch (event.kind) {
        case 'webhook':
            return <WebhookDetail event={event.payload} />
        case 'audit':
            return <AuditDetail entry={event.payload} />
        case 'transaction':
            return (
                <span>
                    {event.payload.amount.toFixed(2)} {event.payload.currency} ·{' '}
                    status {event.payload.status}
                    {event.payload.escrowReleaseStatus &&
                        ` · escrow ${event.payload.escrowReleaseStatus}`}
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
    }
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

    return (
        <span className="inline-flex flex-wrap items-baseline gap-x-2">
            <span className="font-mono text-[11px]">{entry.action}</span>
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
