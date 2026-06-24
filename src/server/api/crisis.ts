import { createServerFn } from '@tanstack/react-start'
import { apiClient } from '../client'

import type { TimelineEvent, WebhookEventSummary } from '@/types/crisis'

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
