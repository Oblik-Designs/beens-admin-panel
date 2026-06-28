import { createServerFn } from '@tanstack/react-start'
import { apiClient } from '../client'

import type {
    AuditTargetModel,
    RemediationContext,
    TimelineEvent,
    WebhookEventPayload,
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
    provider?: 'XENDIT' | 'SUMSUB' | 'TWILIO' | 'BREVO'
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

// ─── GET /admin/webhook-events/:id/payload (SUPERADMIN) ─────────────

interface WebhookEventPayloadResponse {
    success: boolean
    data: WebhookEventPayload
}

export const getWebhookEventPayload = createServerFn({ method: 'GET' }).handler(
    async (ctx) => {
        const eventId = (ctx.data ?? '') as string
        if (!eventId) throw new Error('eventId is required')
        return await apiClient.get<WebhookEventPayloadResponse>(
            `/admin/webhook-events/${encodeURIComponent(eventId)}/payload`,
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
        // Phase 9 — entity ids for the transaction-/application-scoped
        // resolve endpoints, surfaced even when the context targets a User.
        transactionId?: string | null
        applicationId?: string | null
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

// ─── POST /admin/transactions/:id/force-status (Phase 5e) ───────────

export interface ForceTransactionStatusRequest {
    transactionId: string
    targetStatus: string
    dryRun: boolean
    reason?: string
}

export interface ForceTransactionStatusResponse {
    success: boolean
    data: {
        transactionId: string
        dryRun: boolean
        before: { status: string; escrowReleaseStatus: string | null }
        after: { status: string; escrowReleaseStatus: string | null }
        changed: boolean
        summary: string
        auditEntryId: string | null
    }
}

export const forceTransactionStatus = createServerFn({ method: 'POST' }).handler(
    async (ctx) => {
        const { transactionId, targetStatus, dryRun, reason } = (ctx.data ??
            {}) as ForceTransactionStatusRequest
        if (!transactionId) throw new Error('transactionId is required')
        if (!targetStatus) throw new Error('targetStatus is required')
        return await apiClient.post<ForceTransactionStatusResponse>(
            `/admin/transactions/${encodeURIComponent(transactionId)}/force-status`,
            { targetStatus, dryRun, reason },
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

// ─── POST /admin/users/:id/resend-otp (Phase 5c) ────────────────────

export interface ResendOtpRequest {
    userId: string
    channel?: 'phone' | 'email' | 'auto'
    dryRun: boolean
    reason?: string
}

export interface ResendOtpResponse {
    success: boolean
    data: {
        userId: string
        dryRun: boolean
        channel: 'phone' | 'email' | null
        maskedContact: string | null
        sent: boolean
        summary: string
        auditEntryId: string | null
    }
}

export const resendOtp = createServerFn({ method: 'POST' }).handler(
    async (ctx) => {
        const { userId, channel, dryRun, reason } = (ctx.data ?? {}) as ResendOtpRequest
        if (!userId) throw new Error('userId is required')
        return await apiClient.post<ResendOtpResponse>(
            `/admin/users/${encodeURIComponent(userId)}/resend-otp`,
            { channel, dryRun, reason },
        )
    },
)

// ─── POST /admin/users/:id/verify-contact (Phase 5c) ────────────────

export interface VerifyContactRequest {
    userId: string
    verifyEmail?: boolean
    verifyPhone?: boolean
    dryRun: boolean
    reason?: string
}

interface ContactSnapshot {
    isEmailVerified: boolean
    isPhoneVerified: boolean
}

export interface VerifyContactResponse {
    success: boolean
    data: {
        userId: string
        dryRun: boolean
        before: ContactSnapshot
        after: ContactSnapshot
        changed: boolean
        summary: string
        auditEntryId: string | null
    }
}

export const verifyContact = createServerFn({ method: 'POST' }).handler(
    async (ctx) => {
        const { userId, verifyEmail, verifyPhone, dryRun, reason } =
            (ctx.data ?? {}) as VerifyContactRequest
        if (!userId) throw new Error('userId is required')
        return await apiClient.post<VerifyContactResponse>(
            `/admin/users/${encodeURIComponent(userId)}/verify-contact`,
            { verifyEmail, verifyPhone, dryRun, reason },
        )
    },
)

// ─── POST /admin/users/:id/unstick-incomplete (Phase 5c) ────────────

export interface UnstickIncompleteRequest {
    userId: string
    dryRun: boolean
    reason?: string
}

interface StatusSnapshot {
    status: string | null
}

export interface UnstickIncompleteResponse {
    success: boolean
    data: {
        userId: string
        dryRun: boolean
        before: StatusSnapshot
        after: StatusSnapshot
        changed: boolean
        summary: string
        auditEntryId: string | null
    }
}

export const unstickIncomplete = createServerFn({ method: 'POST' }).handler(
    async (ctx) => {
        const { userId, dryRun, reason } = (ctx.data ?? {}) as UnstickIncompleteRequest
        if (!userId) throw new Error('userId is required')
        return await apiClient.post<UnstickIncompleteResponse>(
            `/admin/users/${encodeURIComponent(userId)}/unstick-incomplete`,
            { dryRun, reason },
        )
    },
)

// ─── POST /admin/transactions/:id/reverse-failed-splits (Phase 9) ────
// Phantom On-Hold verified reverse (§16.4). No dry-run: the endpoint
// snapshots balance, reverses the orphaned FAILED-txn splits, re-reads,
// and asserts withdrawable delta = ฿0 (expected — no real money moved).

export interface ReverseFailedSplitsRequest {
    transactionId: string
    reason: string
}

interface BalanceSnap {
    hostId: string
    available: Record<string, number>
    held: Record<string, number>
}

export interface ReverseFailedSplitsResponse {
    success: boolean
    data: {
        transactionId: string
        dryRun: boolean
        changed: boolean
        affectedHostIds: Array<string>
        withdrawableDelta: number
        before: Array<BalanceSnap>
        after: Array<BalanceSnap>
        summary: string
        auditEntryId: string | null
    }
}

export const reverseFailedSplits = createServerFn({ method: 'POST' }).handler(
    async (ctx) => {
        const { transactionId, reason } = (ctx.data ??
            {}) as ReverseFailedSplitsRequest
        if (!transactionId) throw new Error('transactionId is required')
        if (!reason) throw new Error('reason is required')
        return await apiClient.post<ReverseFailedSplitsResponse>(
            `/admin/transactions/${encodeURIComponent(transactionId)}/reverse-failed-splits`,
            { reason, dryRun: false },
        )
    },
)

// ─── POST /admin/applications/:id/process-ghosted (Phase 9) ──────────
// Ghost A resolve (§16.4): expire + refund + notify the ghosted
// application. Idempotent — re-run claims nothing (expired=0).

export interface ProcessGhostedRequest {
    applicationId: string
    reason: string
}

export interface ProcessGhostedResponse {
    success: boolean
    data: {
        applicationId: string
        planId: string | null
        dryRun: boolean
        expiredReason: string | null
        changed: boolean
        refunded: boolean
        refundFailed: boolean
        summary: string
        auditEntryId: string | null
    }
}

export const processGhosted = createServerFn({ method: 'POST' }).handler(
    async (ctx) => {
        const { applicationId, reason } = (ctx.data ?? {}) as ProcessGhostedRequest
        if (!applicationId) throw new Error('applicationId is required')
        if (!reason) throw new Error('reason is required')
        return await apiClient.post<ProcessGhostedResponse>(
            `/admin/applications/${encodeURIComponent(applicationId)}/process-ghosted`,
            { reason, dryRun: false },
        )
    },
)

// ─── POST /admin/applications/:id/resend-expiry-notice (Phase 9) ─────
// Ghost B resolve (§16.4): re-emit the "Refund Issued" notice for a
// silently-refunded application (the Redis/laptop gap — Jayrold's case).

export interface ResendExpiryNoticeRequest {
    applicationId: string
    reason: string
}

export interface ResendExpiryNoticeResponse {
    success: boolean
    data: {
        applicationId: string
        planId: string | null
        applicantId: string
        dryRun: boolean
        sent: boolean
        refundState: 'refunded' | 'none' | 'failed'
        summary: string
        auditEntryId: string | null
    }
}

export const resendExpiryNotice = createServerFn({ method: 'POST' }).handler(
    async (ctx) => {
        const { applicationId, reason } = (ctx.data ??
            {}) as ResendExpiryNoticeRequest
        if (!applicationId) throw new Error('applicationId is required')
        if (!reason) throw new Error('reason is required')
        return await apiClient.post<ResendExpiryNoticeResponse>(
            `/admin/applications/${encodeURIComponent(applicationId)}/resend-expiry-notice`,
            { reason, dryRun: false },
        )
    },
)
