import { queryOptions } from '@tanstack/react-query'

import type {
    AdminAuditEntry,
    AuditTargetModel,
    RemediationAction,
    RemediationApplyResponse,
    RemediationContext,
    TimelineEvent,
    WebhookEventSummary,
} from '@/types/crisis'
import type {WebhookEventsSearchParams} from '@/server/api/crisis';
import { mockAuditEntries } from '@/data/crisis-mocks'
import {
    
    allowKycResubmit,
    forceTransactionStatus,
    getPlanTimeline,
    getRemediationContext,
    getTransactionTimeline,
    getUserTimeline,
    processGhosted,
    reconcileTransaction,
    replayWebhookEvent,
    resendExpiryNotice,
    resendOtp,
    resyncKyc,
    reverseFailedSplits,
    searchWebhookEvents,
    unstickIncomplete,
    verifyContact
} from '@/server/api/crisis'

/**
 * Crisis Console queries.
 *
 * Wired against the Phase 3 read endpoints in beens-api as of this
 * commit (POST /admin/webhook-events + three /admin/.../timeline GETs).
 * Audit search + remediation context + preview/apply still resolve to
 * fixtures from `data/crisis-mocks.ts` — those land in Phases 4/5.
 *
 * Consumer contract: every options factory resolves to
 * `{ success: boolean; data: <unwrapped payload> }`. The API responses
 * are unwrapped one extra layer so the route components don't need to
 * know whether the payload came from a mock or the real backend.
 */

const SIMULATED_LATENCY_MS = 150
const delay = (ms = SIMULATED_LATENCY_MS) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms))

interface ListResult<T> {
    success: boolean
    data: { rows: Array<T>; total: number }
}

// ─── Webhook events ─────────────────────────────────────────────────

export const webhookEventsOptions = (params?: WebhookEventsSearchParams) =>
    queryOptions({
        queryKey: ['crisis', 'webhook-events', params],
        queryFn: async (): Promise<ListResult<WebhookEventSummary>> => {
            // @ts-expect-error - createServerFn types don't reflect POST data parameter
            const res = await searchWebhookEvents({ data: params ?? {} })
            return {
                success: res.success,
                data: {
                    rows: res.data.webhookEvents,
                    total: res.data.pagination.totalItems,
                },
            }
        },
    })

// ─── Admin audit ────────────────────────────────────────────────────
// Still on mocks — no dedicated /admin/audit search endpoint until Phase 4.

interface AuditQueryParams {
    targetModel?: string
    targetId?: string
    actor?: string
    limit?: number
}

export const auditEntriesOptions = (params?: AuditQueryParams) =>
    queryOptions({
        queryKey: ['crisis', 'audit', params],
        queryFn: async (): Promise<ListResult<AdminAuditEntry>> => {
            await delay()
            let rows = mockAuditEntries
            if (params?.targetModel)
                rows = rows.filter((r) => r.targetModel === params.targetModel)
            if (params?.targetId) rows = rows.filter((r) => r.targetId === params.targetId)
            if (params?.actor) rows = rows.filter((r) => r.actor._id === params.actor)
            return {
                success: true,
                data: {
                    rows: rows.slice(0, params?.limit ?? 20),
                    total: rows.length,
                },
            }
        },
    })

// ─── Timelines (User / Plan / Transaction 360s) ─────────────────────

export const userTimelineOptions = (userId: string | null) =>
    queryOptions({
        queryKey: ['crisis', 'timeline', 'user', userId],
        queryFn: async (): Promise<{ success: boolean; data: Array<TimelineEvent> }> => {
            if (!userId) return { success: true, data: [] }
            // @ts-expect-error - createServerFn types don't reflect GET data parameter
            const res = await getUserTimeline({ data: { id: userId } })
            return { success: res.success, data: res.data.timeline }
        },
        enabled: !!userId,
    })

export const planTimelineOptions = (planId: string | null) =>
    queryOptions({
        queryKey: ['crisis', 'timeline', 'plan', planId],
        queryFn: async (): Promise<{ success: boolean; data: Array<TimelineEvent> }> => {
            if (!planId) return { success: true, data: [] }
            // @ts-expect-error - createServerFn types don't reflect GET data parameter
            const res = await getPlanTimeline({ data: { id: planId } })
            return { success: res.success, data: res.data.timeline }
        },
        enabled: !!planId,
    })

export const transactionTimelineOptions = (transactionId: string | null) =>
    queryOptions({
        queryKey: ['crisis', 'timeline', 'transaction', transactionId],
        queryFn: async (): Promise<{ success: boolean; data: Array<TimelineEvent> }> => {
            if (!transactionId) return { success: true, data: [] }
            // @ts-expect-error - createServerFn types don't reflect GET data parameter
            const res = await getTransactionTimeline({ data: { id: transactionId } })
            return { success: res.success, data: res.data.timeline }
        },
        enabled: !!transactionId,
    })

// ─── Remediation context (per-entity) ───────────────────────────────
// Wired against POST /admin/remediation-context (Phase 4). The endpoint
// reads entity state + most recent linked webhook event, computes a
// signal key from `shared/crisis-copy.ts`, and returns the operator-
// facing summary + recommended actions. Empty `summary` + empty
// `actions` means "no signal matched" — the panel should render
// nothing (or a quiet empty state).

export const remediationContextOptions = (
    targetModel: AuditTargetModel | null,
    targetId: string | null,
) =>
    queryOptions({
        queryKey: ['crisis', 'remediation', targetModel, targetId],
        queryFn: async (): Promise<{
            success: boolean
            data: RemediationContext | null
        }> => {
            if (!targetModel || !targetId) return { success: true, data: null }
            // @ts-expect-error - createServerFn types don't reflect POST data parameter
            const res = await getRemediationContext({ data: { targetModel, targetId } })
            if (!res.data.summary || res.data.actions.length === 0) {
                return { success: res.success, data: null }
            }
            return {
                success: res.success,
                data: {
                    targetModel: res.data.targetModel,
                    targetId: res.data.targetId,
                    summary: res.data.summary,
                    divergence: res.data.divergence ?? undefined,
                    webhookEventId: res.data.webhookEventId ?? null,
                    transactionId: res.data.transactionId ?? null,
                    applicationId: res.data.applicationId ?? null,
                    actions: res.data.actions,
                },
            }
        },
        enabled: !!targetModel && !!targetId,
    })

// ─── Mutation hooks — preview & apply ───────────────────────────────
// Phase 5a wires `replay_webhook` (POST /admin/webhook-events/:id/replay)
// and `reconcile_transaction` (POST /admin/transactions/:id/reconcile)
// to real endpoints. Remaining action keys still fall through to the
// placeholder until Phase 5b–5f land — the panel disables Apply on those
// rows via the role gate, so operators see "Recommended" but can't
// proceed yet.

const PLACEHOLDER_PREVIEW =
    '→ (placeholder preview — endpoint ships in a later Phase 5 PR)'

/**
 * Extra per-action inputs the generic panel can't model with just a reason.
 * `force_transaction_status` carries the operator's chosen target status here.
 */
export interface RemediationActionParams {
    targetStatus?: string
}

export async function previewRemediationAction(
    action: RemediationAction,
    context: RemediationContext,
    params?: RemediationActionParams,
): Promise<string> {
    if (action.key === 'force_transaction_status') {
        const transactionId =
            context.targetModel === 'Transaction' ? context.targetId : null
        if (!transactionId) {
            return 'Cannot force status: this action targets a transaction.'
        }
        const targetStatus = params?.targetStatus
        if (!targetStatus) {
            return 'Choose a target status above to preview the change.'
        }
        const res = await forceTransactionStatus({
            // @ts-expect-error - createServerFn types don't reflect POST data parameter
            data: { transactionId, targetStatus, dryRun: true },
        })
        const d = res.data
        return [
            d.summary,
            `Before: status=${d.before.status} / escrow=${d.before.escrowReleaseStatus ?? '(none)'}`,
            `After:  status=${d.after.status} / escrow=${d.after.escrowReleaseStatus ?? '(none)'}`,
            d.changed
                ? 'Dry run — click Apply with a reason to write.'
                : 'No change — transaction is already in this status.',
        ].join('\n')
    }
    if (action.key === 'replay_webhook') {
        const eventId = context.webhookEventId
        if (!eventId) {
            return 'Cannot replay: no stored webhook event linked to this entity.'
        }
        const res = await replayWebhookEvent({
            // @ts-expect-error - createServerFn types don't reflect POST data parameter
            data: { eventId, dryRun: true },
        })
        const { provider, eventName, summary, executed, replayCount, reason } = res.data
        if (!summary) {
            return [
                `Webhook ${eventId} cannot be replayed (${reason ?? 'no replay plan'}).`,
                `provider=${provider}, event=${eventName ?? '-'}, prior replays=${replayCount}`,
            ].join('\n')
        }
        return [
            `Replay plan: ${summary}`,
            `provider=${provider}, event=${eventName ?? '-'}, prior replays=${replayCount}`,
            executed
                ? '(unexpected — dry-run returned executed=true)'
                : 'Dry run — no side effects applied yet. Click Apply with a reason to run.',
        ].join('\n')
    }
    if (action.key === 'reconcile_transaction') {
        const transactionId =
            context.targetModel === 'Transaction' ? context.targetId : null
        if (!transactionId) {
            return 'Cannot reconcile: this action targets a transaction.'
        }
        // Reconcile is read-only — the "preview" *is* the live re-pull
        // from Xendit. We still call it on Preview so the operator sees
        // the divergence before clicking Apply (which records the audit
        // row but does not mutate anything).
        const res = await reconcileTransaction({
            // @ts-expect-error - createServerFn types don't reflect POST data parameter
            data: { transactionId },
        })
        const { divergence, provider } = res.data
        return [
            `DB status:       ${divergence.dbStatus}`,
            `Provider status: ${divergence.providerStatus}`,
            divergence.matches
                ? 'States agree — no operator action needed.'
                : `Divergence cause: ${divergence.cause ?? '(unclassified)'}`,
            provider.amount !== null
                ? `Xendit amount: ${provider.amount} ${provider.currency ?? ''}`.trim()
                : '',
        ]
            .filter(Boolean)
            .join('\n')
    }
    if (action.key === 'resync_kyc') {
        const userId = context.targetModel === 'User' ? context.targetId : null
        if (!userId) {
            return 'Cannot resync KYC: this action targets a user.'
        }
        const res = await resyncKyc({
            // @ts-expect-error - createServerFn types don't reflect POST data parameter
            data: { userId, dryRun: true },
        })
        const d = res.data
        return [
            d.summary,
            `Sumsub review status: ${d.sumsubReviewStatus || '(none)'}`,
            `Before: ${d.before.status ?? 'NOT_STARTED'} / ${d.before.verificationStatus ?? 'UNVERIFIED'}`,
            `After:  ${d.after.status ?? 'NOT_STARTED'} / ${d.after.verificationStatus ?? 'UNVERIFIED'}`,
            d.requiresReinitiation
                ? '(Sumsub reports the user needs a fresh SDK session)'
                : '',
            'Dry run — click Apply with a reason to write.',
        ]
            .filter(Boolean)
            .join('\n')
    }
    if (action.key === 'allow_kyc_resubmit') {
        const userId = context.targetModel === 'User' ? context.targetId : null
        if (!userId) {
            return 'Cannot allow resubmit: this action targets a user.'
        }
        const res = await allowKycResubmit({
            // @ts-expect-error - createServerFn types don't reflect POST data parameter
            data: { userId, dryRun: true },
        })
        const d = res.data
        return [
            d.summary,
            `Before: ${d.before.status ?? 'NOT_STARTED'} / applicant=${d.before.sumsubApplicantId ?? '(none)'}`,
            `After:  NOT_STARTED / applicant=(cleared)`,
            'Dry run — click Apply with a reason to write.',
        ].join('\n')
    }
    if (action.key === 'resend_otp') {
        const userId = context.targetModel === 'User' ? context.targetId : null
        if (!userId) {
            return 'Cannot resend OTP: this action targets a user.'
        }
        const res = await resendOtp({
            // @ts-expect-error - createServerFn types don't reflect POST data parameter
            data: { userId, channel: 'auto', dryRun: true },
        })
        const d = res.data
        return [
            d.summary,
            d.channel
                ? `Will send via ${d.channel} to ${d.maskedContact ?? '(unknown)'}.`
                : 'No channel available.',
            'Dry run — click Apply with a reason to actually send.',
        ]
            .filter(Boolean)
            .join('\n')
    }
    if (action.key === 'verify_contact') {
        const userId = context.targetModel === 'User' ? context.targetId : null
        if (!userId) {
            return 'Cannot verify contact: this action targets a user.'
        }
        // Default Preview to both flags so the operator sees the full
        // candidate diff — Apply lets them narrow it down if needed.
        const res = await verifyContact({
            // @ts-expect-error - createServerFn types don't reflect POST data parameter
            data: { userId, verifyEmail: true, verifyPhone: true, dryRun: true },
        })
        const d = res.data
        return [
            d.summary,
            `Before: email=${d.before.isEmailVerified} / phone=${d.before.isPhoneVerified}`,
            `After:  email=${d.after.isEmailVerified} / phone=${d.after.isPhoneVerified}`,
            'Dry run — click Apply with a reason to write.',
        ].join('\n')
    }
    if (action.key === 'unstick_incomplete') {
        const userId = context.targetModel === 'User' ? context.targetId : null
        if (!userId) {
            return 'Cannot unstick: this action targets a user.'
        }
        const res = await unstickIncomplete({
            // @ts-expect-error - createServerFn types don't reflect POST data parameter
            data: { userId, dryRun: true },
        })
        const d = res.data
        return [
            d.summary,
            `Before: status=${d.before.status ?? '(none)'}`,
            `After:  status=${d.after.status ?? '(none)'}`,
            'Dry run — click Apply with a reason to write.',
        ].join('\n')
    }
    // ── Phase 9 — phantom / ghost resolves ──────────────────────────
    // These endpoints have no dry-run (§16.4): the reverse is verified
    // server-side and is reversible data hygiene, the ghost resolves are
    // idempotent. So Preview here is purely informational — it describes
    // what Apply will do without touching the backend.
    if (action.key === 'reverse_failed_splits') {
        const txnId = resolvePhantomTxnId(context)
        if (!txnId) {
            return 'Cannot reverse: no FAILED transaction is linked to this signal.'
        }
        return [
            `Will reverse the orphaned HELD/AVAILABLE splits on FAILED txn ${txnId}.`,
            'Verified server-side: balance is snapshotted before/after and the',
            'withdrawable delta must be ฿0 (the display-layer fix already shipped —',
            'this is data reconciliation only, no real money moves).',
            'Apply requires a reason and writes an audit row.',
        ].join('\n')
    }
    if (action.key === 'process_ghosted') {
        const appId = context.applicationId
        if (!appId) {
            return 'Cannot process: no ghosted application is linked to this signal.'
        }
        return [
            `Will expire + refund + notify the ghosted application ${appId}.`,
            'Runs in-cluster, so the refund notification actually delivers',
            '(unlike the laptop runbook run). Idempotent — re-running claims',
            'nothing if it already processed.',
            'Apply requires a reason and writes an audit row.',
        ].join('\n')
    }
    if (action.key === 'resend_expiry_notice') {
        const appId = context.applicationId
        if (!appId) {
            return 'Cannot resend: no application is linked to this signal.'
        }
        return [
            `Will re-emit the "Refund Issued" notice for application ${appId}.`,
            'Use when the refund landed but the joiner was never notified',
            '(the Redis/laptop silent-refund gap). Apply requires a reason.',
        ].join('\n')
    }

    await delay(200)
    return `Would call: ${action.key}\n${PLACEHOLDER_PREVIEW}`
}

/**
 * Phase 9 — resolve the FAILED transaction id a phantom reverse targets.
 * When the context targets a Transaction directly use its id; otherwise
 * (e.g. on the host's User 360) fall back to the `transactionId` the
 * backend remediation-context surfaces alongside the action.
 */
function resolvePhantomTxnId(context: RemediationContext): string | null {
    if (context.targetModel === 'Transaction') return context.targetId
    return context.transactionId ?? null
}

/** Format a THB amount with a ฿ sign and two decimals. */
function thb(amount: number): string {
    return `฿${amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`
}

export async function applyRemediationAction(
    action: RemediationAction,
    reason: string,
    context: RemediationContext,
    params?: RemediationActionParams,
): Promise<RemediationApplyResponse> {
    if (action.key === 'force_transaction_status') {
        const transactionId =
            context.targetModel === 'Transaction' ? context.targetId : null
        if (!transactionId) {
            throw new Error('Cannot force status: this action targets a transaction.')
        }
        const targetStatus = params?.targetStatus
        if (!targetStatus) {
            throw new Error('A target status is required to force the transaction.')
        }
        const res = await forceTransactionStatus({
            // @ts-expect-error - createServerFn types don't reflect POST data parameter
            data: { transactionId, targetStatus, dryRun: false, reason },
        })
        return {
            success: res.success,
            result: 'APPLIED',
            auditEntryId: res.data.auditEntryId ?? '',
            diffSummary: res.data.summary,
        }
    }
    if (action.key === 'replay_webhook') {
        const eventId = context.webhookEventId
        if (!eventId) {
            throw new Error('Cannot replay: no stored webhook event linked to this entity.')
        }
        const res = await replayWebhookEvent({
            // @ts-expect-error - createServerFn types don't reflect POST data parameter
            data: { eventId, dryRun: false, reason },
        })
        return {
            success: res.success,
            result: 'APPLIED',
            auditEntryId: res.data.auditEntryId ?? '',
            diffSummary: res.data.summary ?? `Replayed ${eventId}.`,
        }
    }
    if (action.key === 'reconcile_transaction') {
        const transactionId =
            context.targetModel === 'Transaction' ? context.targetId : null
        if (!transactionId) {
            throw new Error('Cannot reconcile: this action targets a transaction.')
        }
        const res = await reconcileTransaction({
            // @ts-expect-error - createServerFn types don't reflect POST data parameter
            data: { transactionId, reason },
        })
        const { divergence } = res.data
        return {
            success: res.success,
            result: 'APPLIED',
            auditEntryId: res.data.auditEntryId ?? '',
            diffSummary: divergence.matches
                ? `Re-pulled Xendit — DB and provider agree (${divergence.dbStatus}).`
                : `Re-pulled Xendit — divergence: DB=${divergence.dbStatus} vs provider=${divergence.providerStatus}.`,
        }
    }
    if (action.key === 'resync_kyc') {
        const userId = context.targetModel === 'User' ? context.targetId : null
        if (!userId) {
            throw new Error('Cannot resync KYC: this action targets a user.')
        }
        const res = await resyncKyc({
            // @ts-expect-error - createServerFn types don't reflect POST data parameter
            data: { userId, dryRun: false, reason },
        })
        return {
            success: res.success,
            result: 'APPLIED',
            auditEntryId: res.data.auditEntryId ?? '',
            diffSummary: res.data.summary,
        }
    }
    if (action.key === 'allow_kyc_resubmit') {
        const userId = context.targetModel === 'User' ? context.targetId : null
        if (!userId) {
            throw new Error('Cannot allow resubmit: this action targets a user.')
        }
        const res = await allowKycResubmit({
            // @ts-expect-error - createServerFn types don't reflect POST data parameter
            data: { userId, dryRun: false, reason },
        })
        return {
            success: res.success,
            result: 'APPLIED',
            auditEntryId: res.data.auditEntryId ?? '',
            diffSummary: res.data.summary,
        }
    }
    if (action.key === 'resend_otp') {
        const userId = context.targetModel === 'User' ? context.targetId : null
        if (!userId) {
            throw new Error('Cannot resend OTP: this action targets a user.')
        }
        const res = await resendOtp({
            // @ts-expect-error - createServerFn types don't reflect POST data parameter
            data: { userId, channel: 'auto', dryRun: false, reason },
        })
        return {
            success: res.success,
            result: 'APPLIED',
            auditEntryId: res.data.auditEntryId ?? '',
            diffSummary: res.data.summary,
        }
    }
    if (action.key === 'verify_contact') {
        const userId = context.targetModel === 'User' ? context.targetId : null
        if (!userId) {
            throw new Error('Cannot verify contact: this action targets a user.')
        }
        const res = await verifyContact({
            // @ts-expect-error - createServerFn types don't reflect POST data parameter
            data: { userId, verifyEmail: true, verifyPhone: true, dryRun: false, reason },
        })
        return {
            success: res.success,
            result: 'APPLIED',
            auditEntryId: res.data.auditEntryId ?? '',
            diffSummary: res.data.summary,
        }
    }
    if (action.key === 'unstick_incomplete') {
        const userId = context.targetModel === 'User' ? context.targetId : null
        if (!userId) {
            throw new Error('Cannot unstick: this action targets a user.')
        }
        const res = await unstickIncomplete({
            // @ts-expect-error - createServerFn types don't reflect POST data parameter
            data: { userId, dryRun: false, reason },
        })
        return {
            success: res.success,
            result: 'APPLIED',
            auditEntryId: res.data.auditEntryId ?? '',
            diffSummary: res.data.summary,
        }
    }
    // ── Phase 9 — phantom / ghost resolves ──────────────────────────
    if (action.key === 'reverse_failed_splits') {
        const txnId = resolvePhantomTxnId(context)
        if (!txnId) {
            throw new Error(
                'Cannot reverse: no FAILED transaction is linked to this signal.',
            )
        }
        const res = await reverseFailedSplits({
            // @ts-expect-error - createServerFn types don't reflect POST data parameter
            data: { transactionId: txnId, reason },
        })
        const d = res.data
        const delta = d.withdrawableDelta
        // Q1 invariant: withdrawable must not move. Surface the delta
        // prominently so the operator sees the ฿0 proof in the result panel.
        const deltaLine =
            delta === 0
                ? `Withdrawable delta: ${thb(0)} ✓ (no real money moved)`
                : `⚠ Withdrawable delta: ${thb(delta)} — expected ฿0, escalate.`
        return {
            success: res.success,
            result: 'APPLIED',
            auditEntryId: d.auditEntryId ?? '',
            diffSummary: `${d.summary}\n${deltaLine}`,
        }
    }
    if (action.key === 'process_ghosted') {
        const appId = context.applicationId
        if (!appId) {
            throw new Error(
                'Cannot process: no ghosted application is linked to this signal.',
            )
        }
        const res = await processGhosted({
            // @ts-expect-error - createServerFn types don't reflect POST data parameter
            data: { applicationId: appId, reason },
        })
        const d = res.data
        return {
            success: res.success,
            result: 'APPLIED',
            auditEntryId: d.auditEntryId ?? '',
            diffSummary:
                d.summary ||
                `Processed ghosted application ${appId}: changed=${d.changed}, refunded=${d.refunded}, refundFailed=${d.refundFailed}.`,
        }
    }
    if (action.key === 'resend_expiry_notice') {
        const appId = context.applicationId
        if (!appId) {
            throw new Error(
                'Cannot resend: no application is linked to this signal.',
            )
        }
        const res = await resendExpiryNotice({
            // @ts-expect-error - createServerFn types don't reflect POST data parameter
            data: { applicationId: appId, reason },
        })
        const d = res.data
        return {
            success: res.success,
            result: 'APPLIED',
            auditEntryId: d.auditEntryId ?? '',
            diffSummary:
                d.summary ||
                (d.sent
                    ? `Re-sent the "Refund Issued" notice for application ${appId}.`
                    : `No notice sent for application ${appId}.`),
        }
    }

    await delay(400)
    return {
        success: true,
        result: 'APPLIED',
        auditEntryId: `mock-audit-${action.key}-${Date.now()}`,
        diffSummary: `Applied ${action.label}.`,
    }
}
