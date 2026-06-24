import { queryOptions } from '@tanstack/react-query'

import {
    mockAuditEntries,
    mockTxnRemediationContext,
    mockUserRemediationContext,
} from '@/data/crisis-mocks'
import {
    getPlanTimeline,
    getTransactionTimeline,
    getUserTimeline,
    searchWebhookEvents,
    type WebhookEventsSearchParams,
} from '@/server/api/crisis'
import type {
    AdminAuditEntry,
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
// Still on mocks — recommendation/divergence ships in Phase 4.

export const remediationContextOptions = (
    targetModel: string | null,
    targetId: string | null,
) =>
    queryOptions({
        queryKey: ['crisis', 'remediation', targetModel, targetId],
        queryFn: async (): Promise<{ success: boolean; data: RemediationContext }> => {
            await delay()
            return {
                success: true,
                data:
                    targetModel === 'User'
                        ? mockUserRemediationContext
                        : mockTxnRemediationContext,
            }
        },
        enabled: !!targetModel && !!targetId,
    })

// ─── Mutation hooks — preview & apply (placeholder) ─────────────────
// Phase 5 endpoints — still mock.

export async function previewRemediationAction(
    action: RemediationAction,
): Promise<string> {
    await delay(200)
    return [
        `Would call: ${action.key}`,
        action.key === 'replay_webhook'
            ? '→ Re-runs the stored webhook through Payments.completePlanPayment.'
            : action.key === 'reconcile_transaction'
                ? '→ Re-pulls Xendit /sessions/:id and compares with DB.'
                : action.key === 'force_transaction_status'
                    ? '→ Forces txn status. Last-resort manual override.'
                    : '→ (placeholder preview — wire to real endpoint in Phase 5)',
    ].join('\n')
}

export async function applyRemediationAction(
    action: RemediationAction,
    _reason: string,
): Promise<RemediationApplyResponse> {
    await delay(400)
    return {
        success: true,
        result: 'APPLIED',
        auditEntryId: `mock-audit-${action.key}-${Date.now()}`,
        diffSummary: `Applied ${action.label}.`,
    }
}
