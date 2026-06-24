import { queryOptions } from '@tanstack/react-query'

import {
    mockAuditEntries,
    mockTxnRemediationContext,
    mockUserRemediationContext,
    mockUserTimeline,
    mockWebhookEvents,
} from '@/data/crisis-mocks'
import type {
    AdminAuditEntry,
    RemediationAction,
    RemediationApplyResponse,
    RemediationContext,
    TimelineEvent,
    WebhookEventSummary,
} from '@/types/crisis'

/**
 * Crisis Console placeholder queries.
 *
 * Each `*Options` factory mirrors the shape we expect once the API ships
 * (Phases 1–5 of admin-crisis-implementation-plan.md). Until then:
 *   - Data comes from `data/crisis-mocks.ts` with a small `delay()` so
 *     loading states still render correctly during dev.
 *   - The mutation helpers below resolve to fixture audit-entry ids.
 *
 * Swap-out path:
 *   1. Replace each `queryFn` with `apiClient.post(...)` against the new
 *      `/admin/...` route.
 *   2. Replace the inline shape with the OpenAPI-generated response type.
 *   3. Delete this file's mock import line; the rest stays.
 */

const SIMULATED_LATENCY_MS = 150
const delay = (ms = SIMULATED_LATENCY_MS) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms))

interface ListResult<T> {
    success: boolean
    data: { rows: Array<T>; total: number }
}

// ─── Webhook events ─────────────────────────────────────────────────

interface WebhookEventsQueryParams {
    provider?: string
    eventName?: string
    skipReason?: string
    linkedTransactionId?: string
    linkedUserId?: string
    sinceMinutes?: number
    limit?: number
}

export const webhookEventsOptions = (params?: WebhookEventsQueryParams) =>
    queryOptions({
        queryKey: ['crisis', 'webhook-events', params],
        queryFn: async (): Promise<ListResult<WebhookEventSummary>> => {
            await delay()
            let rows = mockWebhookEvents
            if (params?.provider) rows = rows.filter((r) => r.provider === params.provider)
            if (params?.eventName) rows = rows.filter((r) => r.eventName === params.eventName)
            if (params?.skipReason)
                rows = rows.filter((r) => r.processing.skipReason === params.skipReason)
            if (params?.linkedTransactionId)
                rows = rows.filter(
                    (r) => r.linkedTransactionId === params.linkedTransactionId,
                )
            if (params?.linkedUserId)
                rows = rows.filter((r) => r.linkedUserId === params.linkedUserId)
            return {
                success: true,
                data: {
                    rows: rows.slice(0, params?.limit ?? 20),
                    total: rows.length,
                },
            }
        },
    })

// ─── Admin audit ────────────────────────────────────────────────────

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
            await delay()
            return { success: true, data: mockUserTimeline }
        },
        enabled: !!userId,
    })

export const planTimelineOptions = (planId: string | null) =>
    queryOptions({
        queryKey: ['crisis', 'timeline', 'plan', planId],
        queryFn: async (): Promise<{ success: boolean; data: Array<TimelineEvent> }> => {
            await delay()
            return { success: true, data: mockUserTimeline }
        },
        enabled: !!planId,
    })

export const transactionTimelineOptions = (transactionId: string | null) =>
    queryOptions({
        queryKey: ['crisis', 'timeline', 'transaction', transactionId],
        queryFn: async (): Promise<{ success: boolean; data: Array<TimelineEvent> }> => {
            await delay()
            return { success: true, data: mockUserTimeline.slice(0, 4) }
        },
        enabled: !!transactionId,
    })

// ─── Remediation context (per-entity) ───────────────────────────────

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
