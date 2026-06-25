import { queryOptions } from '@tanstack/react-query'

import { mockAuditEntries } from '@/data/crisis-mocks'
import {
    allowKycResubmit,
    getPlanTimeline,
    getRemediationContext,
    getTransactionTimeline,
    getUserTimeline,
    reconcileTransaction,
    replayWebhookEvent,
    resendOtp,
    resyncKyc,
    searchWebhookEvents,
    unstickIncomplete,
    verifyContact,
    type WebhookEventsSearchParams,
} from '@/server/api/crisis'
import type {
    AdminAuditEntry,
    AuditTargetModel,
    RemediationAction,
    RemediationApplyResponse,
    RemediationContext,
    TimelineEvent,
    WebhookEventSummary,
} from '@/types/crisis'

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
                    actions: res.data.actions as Array<RemediationAction>,
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

export async function previewRemediationAction(
    action: RemediationAction,
    context: RemediationContext,
): Promise<string> {
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
    await delay(200)
    return `Would call: ${action.key}\n${PLACEHOLDER_PREVIEW}`
}

export async function applyRemediationAction(
    action: RemediationAction,
    reason: string,
    context: RemediationContext,
): Promise<RemediationApplyResponse> {
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
    await delay(400)
    return {
        success: true,
        result: 'APPLIED',
        auditEntryId: `mock-audit-${action.key}-${Date.now()}`,
        diffSummary: `Applied ${action.label}.`,
    }
}
