import {
    BanIcon,
    BellOffIcon,
    CheckCircle2Icon,
    ReceiptTextIcon,
    XCircleIcon,
} from 'lucide-react'

import type { TimelineEvent } from '@/types/crisis'
import { cn } from '@/lib/utils'

/**
 * Phase 9 — Evidence card (ADMIN_CRISIS_CONSOLE_PLAN.md §16.5).
 *
 * A per-rule, DB-derived proof block shown on the relevant 360 next to the
 * RemediationPanel. Two variants matching the two grilled mockups:
 *
 *  - **Phantom (Sascha):** a FAILED txn whose splits were never reversed —
 *    Xendit `gatewayResponse` ("payment expired"), the orphaned
 *    `ESCROW ฿1,000 HELD` split, verdict **balance impact ฿0**, and a
 *    SUPERADMIN-gated `[View raw webhook]`.
 *  - **Ghost B (Jayrold):** an expiry-`WITHDRAWN` app with a `REFUND` txn
 *    that landed but **0 notifications in window** — the silent-refund gap.
 *
 * Q3: the proof is entirely DB-derived (no log-aggregator). It is fed by
 * the existing 360 timeline endpoints — see the `build*Evidence` helpers
 * below. Fields the timeline payload doesn't yet expose (Xendit
 * `gatewayResponse`, per-split state) are rendered as explicit TODO
 * placeholders rather than invented — they need a richer timeline payload
 * or the rule `summary` from the backend, tracked in the TODOs inline.
 */

// ─── Variant prop shapes ────────────────────────────────────────────

interface SplitProof {
    /** e.g. "ESCROW". `undefined` → not yet exposed by the timeline. */
    type?: string
    amount?: number
    currency?: string
    /** e.g. "HELD" / "AVAILABLE". */
    status?: string
}

export interface PhantomEvidence {
    variant: 'phantom'
    transactionId: string
    amount?: number
    currency?: string
    /** Xendit gateway response, e.g. "payment expired". */
    gatewayResponse?: string
    /** The orphaned split stuck in HELD/AVAILABLE. */
    split?: SplitProof
    /** Whether a stored webhook event is linked (drives the raw-payload CTA). */
    hasLinkedWebhook?: boolean
}

export interface GhostEvidence {
    variant: 'ghost'
    applicationId: string
    /** App status — expected WITHDRAWN. */
    status?: string
    /** e.g. "HOST_INACTION_7D". */
    expiredReason?: string | null
    refund?: {
        amount?: number
        currency?: string
        /** e.g. "AVAILABLE". */
        status?: string
        found: boolean
    }
    /** Notifications recorded in the post-expiry window. Expected 0 = the bug. */
    notificationsInWindow: number
}

export type Evidence = PhantomEvidence | GhostEvidence

export interface EvidenceCardProps {
    evidence: Evidence
    /**
     * Whether the operator may reveal the raw webhook payload (SUPERADMIN).
     * Only affects the phantom variant's `[View raw webhook]` affordance.
     */
    canViewRawPayload?: boolean
    /** Invoked when the operator clicks `[View raw webhook]`. */
    onViewRawWebhook?: () => void
    className?: string
}

const TODO = '— (not yet on timeline)'

function money(amount?: number, currency?: string): string {
    if (typeof amount !== 'number') return TODO
    const formatted = amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
    return `฿${formatted}${currency ? ` ${currency}` : ''}`
}

// ─── Component ──────────────────────────────────────────────────────

export function EvidenceCard({
    evidence,
    canViewRawPayload,
    onViewRawWebhook,
    className,
}: EvidenceCardProps) {
    return (
        <div
            className={cn(
                'space-y-2 rounded-lg border border-rose-300 bg-rose-50/60 px-4 py-3 text-rose-900 dark:border-rose-700/60 dark:bg-rose-950/30 dark:text-rose-100',
                className,
            )}
            role="status"
            aria-live="polite"
        >
            <div className="flex items-center gap-2">
                <ReceiptTextIcon className="size-3" aria-hidden="true" />
                <span className="text-xs uppercase tracking-wide">
                    {evidence.variant === 'phantom'
                        ? 'Phantom On-Hold — evidence'
                        : 'Ghosted application — evidence'}
                </span>
            </div>

            {evidence.variant === 'phantom' ? (
                <PhantomBody
                    evidence={evidence}
                    canViewRawPayload={canViewRawPayload}
                    onViewRawWebhook={onViewRawWebhook}
                />
            ) : (
                <GhostBody evidence={evidence} />
            )}
        </div>
    )
}

function Line({
    icon,
    label,
    value,
    tone,
}: {
    icon?: React.ReactNode
    label: string
    value: React.ReactNode
    tone?: 'good' | 'bad' | 'muted'
}) {
    return (
        <div className="flex items-baseline justify-between gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-rose-900/70 dark:text-rose-100/70">
                {icon}
                {label}
            </span>
            <span
                className={cn(
                    'text-right font-mono text-xs',
                    tone === 'good' && 'text-emerald-700 dark:text-emerald-400',
                    tone === 'bad' && 'text-red-700 dark:text-red-400',
                    tone === 'muted' && 'opacity-70',
                )}
            >
                {value}
            </span>
        </div>
    )
}

function PhantomBody({
    evidence,
    canViewRawPayload,
    onViewRawWebhook,
}: {
    evidence: PhantomEvidence
    canViewRawPayload?: boolean
    onViewRawWebhook?: () => void
}) {
    const split = evidence.split
    return (
        <div className="space-y-1.5">
            <Line
                icon={<XCircleIcon className="size-3.5" />}
                label="FAILED txn"
                value={evidence.transactionId}
            />
            <Line
                label="Amount"
                value={money(evidence.amount, evidence.currency)}
            />
            <Line
                label="Gateway response"
                value={evidence.gatewayResponse ?? TODO}
                tone={evidence.gatewayResponse ? undefined : 'muted'}
            />
            {/* TODO(api): per-split state (type / amount / HELD|AVAILABLE) is
                not yet on the transaction timeline payload — needs the rule
                `summary` or a richer timeline event to populate this line. */}
            <Line
                label="Orphaned split"
                value={
                    split
                        ? `${split.type ?? '?'} ${money(split.amount, split.currency)} ${split.status ?? ''}`.trim()
                        : TODO
                }
                tone={split ? undefined : 'muted'}
            />
            <div className="mt-1 rounded-md bg-emerald-100/70 px-2 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                Verdict: balance impact ฿0 — reversing splits is data
                reconciliation only.
            </div>
            {evidence.hasLinkedWebhook && (
                <button
                    type="button"
                    disabled={!canViewRawPayload}
                    onClick={onViewRawWebhook}
                    className="mt-1 text-xs font-medium underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    title={
                        canViewRawPayload
                            ? undefined
                            : 'Raw payload is SUPERADMIN-only.'
                    }
                >
                    View raw webhook{canViewRawPayload ? '' : ' (SUPERADMIN)'}
                </button>
            )}
        </div>
    )
}

function GhostBody({ evidence }: { evidence: GhostEvidence }) {
    const refund = evidence.refund
    const notified = evidence.notificationsInWindow
    return (
        <div className="space-y-1.5">
            <Line
                icon={<BanIcon className="size-3.5" />}
                label="Application"
                value={`${evidence.applicationId}${
                    evidence.status ? ` · ${evidence.status}` : ''
                }`}
            />
            <Line
                label="Expired reason"
                value={evidence.expiredReason ?? TODO}
                tone={evidence.expiredReason ? undefined : 'muted'}
            />
            <Line
                icon={
                    refund?.found ? (
                        <CheckCircle2Icon className="size-3.5 text-emerald-600" />
                    ) : undefined
                }
                label="Refund txn"
                value={
                    refund?.found
                        ? `${money(refund.amount, refund.currency)} ${refund.status ?? ''}`.trim()
                        : TODO
                }
                tone={refund?.found ? 'good' : 'muted'}
            />
            <Line
                icon={<BellOffIcon className="size-3.5" />}
                label="Notifications in window"
                value={String(notified)}
                tone={notified === 0 ? 'bad' : undefined}
            />
            {notified === 0 && (
                <div className="mt-1 rounded-md bg-red-100/70 px-2 py-1 text-xs font-medium text-red-800 dark:bg-red-950/40 dark:text-red-200">
                    Refund landed but the joiner was never notified — resend the
                    expiry notice.
                </div>
            )}
        </div>
    )
}

// ─── Timeline builders (DB-derived, Q3) ─────────────────────────────

/**
 * Derive phantom evidence from a Transaction 360 timeline. Returns `null`
 * when no FAILED transaction is present (the card should not render).
 * `txnId` narrows to a specific transaction when the caller knows it.
 */
export function buildPhantomEvidence(
    events: Array<TimelineEvent>,
    txnId?: string | null,
): PhantomEvidence | null {
    const txns = events.filter(
        (e): e is Extract<TimelineEvent, { kind: 'transaction' }> =>
            e.kind === 'transaction',
    )
    const failed = txns.find(
        (e) =>
            e.payload.status === 'FAILED' &&
            (!txnId || e.payload.transactionId === txnId),
    )
    if (!failed) return null

    const hasLinkedWebhook = events.some(
        (e) =>
            e.kind === 'webhook' &&
            e.payload.linkedTransactionId === failed.payload.transactionId,
    )

    return {
        variant: 'phantom',
        transactionId: failed.payload.transactionId,
        amount: failed.payload.amount,
        currency: failed.payload.currency,
        // TODO(api): gatewayResponse + per-split state are not on the
        // current timeline payload — left undefined so the card shows the
        // explicit placeholder instead of inventing values.
        gatewayResponse: undefined,
        split: undefined,
        hasLinkedWebhook,
    }
}

/**
 * Derive ghost evidence from a User/Plan 360 timeline. Returns `null` when
 * there is no expiry-`WITHDRAWN` application (the card should not render).
 * `applicationId` narrows to a specific application when known.
 */
export function buildGhostEvidence(
    events: Array<TimelineEvent>,
    applicationId?: string | null,
): GhostEvidence | null {
    const apps = events.filter(
        (e): e is Extract<TimelineEvent, { kind: 'application' }> =>
            e.kind === 'application',
    )
    const withdrawn = apps.find(
        (e) =>
            e.payload.status === 'WITHDRAWN' &&
            (!applicationId || e.payload.applicationId === applicationId),
    )
    if (!withdrawn) return null

    // Best-effort refund match: a transaction row flagged REFUND. The
    // timeline payload doesn't link a refund txn to an application id, so
    // this is a heuristic — `found: false` falls back to the placeholder.
    const refundTxn = events.find(
        (e) =>
            e.kind === 'transaction' &&
            /REFUND/i.test(e.payload.status),
    )
    const refund =
        refundTxn && refundTxn.kind === 'transaction'
            ? {
                  amount: refundTxn.payload.amount,
                  currency: refundTxn.payload.currency,
                  status: refundTxn.payload.escrowReleaseStatus ?? undefined,
                  found: true,
              }
            : { found: false }

    // Notifications recorded on the timeline. The "post-expiry window" is
    // server-defined; here we surface the count the timeline carries — 0
    // is the silent-refund signal.
    const notificationsInWindow = events.filter(
        (e) => e.kind === 'notification',
    ).length

    return {
        variant: 'ghost',
        applicationId: withdrawn.payload.applicationId,
        status: withdrawn.payload.status,
        expiredReason: withdrawn.payload.expiredReason,
        refund,
        notificationsInWindow,
    }
}
