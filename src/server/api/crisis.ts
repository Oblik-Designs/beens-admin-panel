import { createServerFn } from '@tanstack/react-start'
import { apiClient } from '../client'

import type {
    AuditTargetModel,
    RemediationContext,
    TimelineEvent,
    WebhookEventSummary,
} from '@/types/crisis'

/**
 * Server-fn wrappers for the Phase 3 admin 360 read endpoints (see
 * `beens-api/src/controllers/routes/admin/{webhook-events,users-timeline,
 * plans-timeline,transactions-timeline}.ts`).
 *
 * Mutations (preview/apply remediation, audit search) still resolve to
 * fixtures in `data/crisis-mocks.ts` — those endpoints land in Phases 4/5.
 */

// ─── POST /admin/webhook-events ─────────────────────────────────────

export interface WebhookEventsSearchParams {
    provider?: 'XENDIT' | 'SUMSUB'
    eventName?: string
    referenceId?: string
    linkedTransactionId?: string
    linkedUserId?: string
    verificationStatus?: 'PASSED' | 'FAILED' | 'SKIPPED'
    processingStatus?: 'PENDING' | 'PROCESSED' | 'SKIPPED' | 'ERROR'
    skipReason?: string
    since?: string
    sinceMinutes?: number
    page?: number
    limit?: number
}

interface WebhookEventsSearchResponse {
    success: boolean
    data: {
        webhookEvents: Array<WebhookEventSummary>
        pagination: {
            page: number
            limit: number
            totalItems: number
            totalPages: number
        }
    }
}

export const searchWebhookEvents = createServerFn({ method: 'POST' }).handler(
    async (ctx) => {
        const params = (ctx.data ?? {}) as WebhookEventsSearchParams
        return await apiClient.post<WebhookEventsSearchResponse>(
            '/admin/webhook-events',
            params,
        )
    },
)

// ─── GET /admin/users/:userId/timeline ──────────────────────────────

interface TimelineResponse {
    success: boolean
    data: { timeline: Array<TimelineEvent> }
}

interface TimelineRequest {
    id: string
    limit?: number
}

const buildTimelinePath = (base: string, limit?: number) =>
    limit ? `${base}?limit=${limit}` : base

export const getUserTimeline = createServerFn({ method: 'GET' }).handler(
    async (ctx) => {
        const { id, limit } = (ctx.data ?? {}) as TimelineRequest
        if (!id) throw new Error('userId is required')
        return await apiClient.get<TimelineResponse>(
            buildTimelinePath(`/admin/users/${encodeURIComponent(id)}/timeline`, limit),
        )
    },
)

export const getPlanTimeline = createServerFn({ method: 'GET' }).handler(
    async (ctx) => {
        const { id, limit } = (ctx.data ?? {}) as TimelineRequest
        if (!id) throw new Error('planId is required')
        return await apiClient.get<TimelineResponse>(
            buildTimelinePath(`/admin/plans/${encodeURIComponent(id)}/timeline`, limit),
        )
    },
)

export const getTransactionTimeline = createServerFn({ method: 'GET' }).handler(
    async (ctx) => {
        const { id, limit } = (ctx.data ?? {}) as TimelineRequest
        if (!id) throw new Error('transactionId is required')
        return await apiClient.get<TimelineResponse>(
            buildTimelinePath(
                `/admin/transactions/${encodeURIComponent(id)}/timeline`,
                limit,
            ),
        )
    },
)

// ─── POST /admin/remediation-context ────────────────────────────────

interface RemediationContextRequest {
    targetModel: AuditTargetModel
    targetId: string
}

interface RemediationContextResponse {
    success: boolean
    data: {
        targetModel: AuditTargetModel
        targetId: string
        summary: string
        signalKey: string | null
        divergence?: RemediationContext['divergence'] | null
        webhookEventId?: string | null
        actions: RemediationContext['actions']
    }
}

export const getRemediationContext = createServerFn({ method: 'POST' }).handler(
    async (ctx) => {
        const { targetModel, targetId } = (ctx.data ?? {}) as RemediationContextRequest
        if (!targetModel || !targetId) {
            throw new Error('targetModel and targetId are required')
        }
        return await apiClient.post<RemediationContextResponse>(
            '/admin/remediation-context',
            { targetModel, targetId },
        )
    },
)

// ─── POST /admin/webhook-events/:id/replay (Phase 5a) ───────────────

export interface ReplayWebhookRequest {
    eventId: string
    dryRun: boolean
    reason?: string
}

export interface ReplayWebhookResponse {
    success: boolean
    data: {
        eventId: string
        provider: string
        eventName: string | null
        dryRun: boolean
        executed: boolean
        summary: string | null
        reason: string | null
        replayCount: number
        auditEntryId: string | null
    }
}

export const replayWebhookEvent = createServerFn({ method: 'POST' }).handler(
    async (ctx) => {
        const { eventId, dryRun, reason } = (ctx.data ?? {}) as ReplayWebhookRequest
        if (!eventId) throw new Error('eventId is required')
        return await apiClient.post<ReplayWebhookResponse>(
            `/admin/webhook-events/${encodeURIComponent(eventId)}/replay`,
            { dryRun, reason },
        )
    },
)

// ─── POST /admin/transactions/:id/reconcile (Phase 5a) ──────────────

export interface ReconcileTransactionRequest {
    transactionId: string
    reason?: string
}

export interface ReconcileTransactionResponse {
    success: boolean
    data: {
        transactionId: string
        sessionId: string | null
        fetchedAt: string
        divergence: {
            dbStatus: string
            providerStatus: string
            matches: boolean
            cause: string | null
        }
        provider: {
            sessionStatus: string | null
            paymentStatus: string | null
            paymentId: string | null
            amount: number | null
            currency: string | null
        }
        auditEntryId: string | null
    }
}

export const reconcileTransaction = createServerFn({ method: 'POST' }).handler(
    async (ctx) => {
        const { transactionId, reason } = (ctx.data ?? {}) as ReconcileTransactionRequest
        if (!transactionId) throw new Error('transactionId is required')
        return await apiClient.post<ReconcileTransactionResponse>(
            `/admin/transactions/${encodeURIComponent(transactionId)}/reconcile`,
            { reason },
        )
    },
)

// ─── POST /admin/users/:id/kyc/resync (Phase 5b) ────────────────────

export interface ResyncKycRequest {
    userId: string
    dryRun: boolean
    reason?: string
}

interface KycSnapshot {
    status: string | null
    verificationStatus: string | null
    reviewAnswer: string | null
    reviewRejectType: string | null
}

export interface ResyncKycResponse {
    success: boolean
    data: {
        userId: string
        applicantId: string
        dryRun: boolean
        sumsubReviewStatus: string
        requiresReinitiation: boolean
        before: KycSnapshot
        after: KycSnapshot
        changed: boolean
        summary: string
        auditEntryId: string | null
    }
}

export const resyncKyc = createServerFn({ method: 'POST' }).handler(
    async (ctx) => {
        const { userId, dryRun, reason } = (ctx.data ?? {}) as ResyncKycRequest
        if (!userId) throw new Error('userId is required')
        return await apiClient.post<ResyncKycResponse>(
            `/admin/users/${encodeURIComponent(userId)}/kyc/resync`,
            { dryRun, reason },
        )
    },
)

// ─── POST /admin/users/:id/kyc/allow-resubmit (Phase 5b) ────────────

export interface AllowKycResubmitRequest {
    userId: string
    dryRun: boolean
    reason?: string
}

interface KycResubmitSnapshot {
    status: string | null
    verificationStatus: string | null
    sumsubApplicantId: string | null
}

export interface AllowKycResubmitResponse {
    success: boolean
    data: {
        userId: string
        dryRun: boolean
        before: KycResubmitSnapshot
        after: KycResubmitSnapshot
        changed: boolean
        summary: string
        auditEntryId: string | null
    }
}

export const allowKycResubmit = createServerFn({ method: 'POST' }).handler(
    async (ctx) => {
        const { userId, dryRun, reason } = (ctx.data ?? {}) as AllowKycResubmitRequest
        if (!userId) throw new Error('userId is required')
        return await apiClient.post<AllowKycResubmitResponse>(
            `/admin/users/${encodeURIComponent(userId)}/kyc/allow-resubmit`,
            { dryRun, reason },
        )
    },
)
