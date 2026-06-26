/**
 * Hand-rolled mock data for the Crisis Console UI.
 *
 * These mocks back the placeholder query hooks while the API-side work
 * (Phase 1+3+5) is in flight. They are intentionally varied so visual
 * states (PASSED/FAILED, all skip reasons, every role gate, every audit
 * result) can be eyeballed during component review.
 *
 * Swap-out path: replace the consumers in `queries/crisis/*.ts` with
 * real `apiClient.post(...)` calls. These mocks remain as fixtures for
 * Vitest tests + Storybook (if/when added).
 */

import type {
    AdminAuditEntry,
    RemediationContext,
    TimelineEvent,
    WebhookEventSummary,
} from '@/types/crisis'

// Stable IDs so React keys are predictable across rerenders during dev.
const FIXED = {
    txnA: '6a3a3cdf3631a4b9a23172d0',
    txnB: '6a32d5bdc55df4d8448b408c',
    userJoiner: '6a143daa971d5d9b7b4d4542',
    userHost: '6a1438cc971d5d9b7b4d44ce',
    planAerobic: '6a3a28f60a879bcd9d8711d8',
    applicantSumsub: 'sumsub-applicant-abc-123',
    adminMod: '6a000000000000000000ad01',
    adminMgr: '6a000000000000000000ad02',
}

// ─── Webhook events ─────────────────────────────────────────────────

export const mockWebhookEvents: Array<WebhookEventSummary> = [
    {
        _id: '6a3ad1b415f58bb59e1f192b',
        provider: 'XENDIT',
        route: '/webhooks/xendit/payment',
        eventName: 'payment.capture',
        receivedAt: '2026-06-23T18:34:28.693Z',
        referenceId: `${FIXED.txnB}-1718000000000`,
        linkedTransactionId: FIXED.txnB,
        linkedUserId: FIXED.userJoiner,
        verification: { status: 'PASSED', method: 'X_CALLBACK_TOKEN', detail: null },
        processing: {
            status: 'PROCESSED',
            skipReason: null,
            durationMs: 156,
            sideEffects: ['completePlanPayment'],
        },
    },
    {
        _id: '6a3ad1b315f58bb59e1f1903',
        provider: 'XENDIT',
        route: '/webhooks/xendit/payment',
        eventName: 'payment.capture',
        receivedAt: '2026-06-23T18:34:27.933Z',
        referenceId: 'x',
        linkedTransactionId: null,
        linkedUserId: null,
        verification: { status: 'FAILED', method: 'X_CALLBACK_TOKEN', detail: 'token_mismatch' },
        processing: {
            status: 'SKIPPED',
            skipReason: 'token_mismatch',
            durationMs: 12,
            sideEffects: [],
        },
    },
    {
        _id: '6a3ad1b415f58bb59e1f1920',
        provider: 'XENDIT',
        route: '/webhooks/xendit/payment',
        eventName: 'payment_request.expiry',
        receivedAt: '2026-06-23T18:34:28.507Z',
        referenceId: `${FIXED.txnB}-1718000000000`,
        linkedTransactionId: FIXED.txnB,
        linkedUserId: null,
        verification: { status: 'PASSED', method: 'X_CALLBACK_TOKEN', detail: null },
        processing: {
            status: 'SKIPPED',
            skipReason: 'unhandled_event',
            durationMs: 18,
            sideEffects: [],
        },
    },
    {
        _id: '6a3ad1e615f58bb59e1f193e',
        provider: 'SUMSUB',
        route: '/webhooks/sumsub',
        eventName: 'applicantReviewed',
        receivedAt: '2026-06-23T18:35:18.826Z',
        referenceId: null,
        linkedTransactionId: null,
        linkedUserId: null,
        verification: { status: 'SKIPPED', method: 'NONE', detail: null },
        processing: {
            status: 'SKIPPED',
            skipReason: 'missing_reference',
            durationMs: 7,
            sideEffects: [],
        },
    },
]

// ─── Admin audit entries ────────────────────────────────────────────

export const mockAuditEntries: Array<AdminAuditEntry> = [
    {
        _id: '6a3b0000aaaa000000000001',
        actor: { _id: FIXED.adminMgr, displayName: 'Alex (manager)' },
        actorRole: 'MANAGER',
        action: 'transaction.reconcile',
        targetModel: 'Transaction',
        targetId: FIXED.txnB,
        reason: 'BNS-09 follow-up — txn stuck PROCESSING > 20 min',
        dryRun: false,
        result: 'APPLIED',
        webhookEventId: '6a3ad1b415f58bb59e1f192b',
        createdAt: '2026-06-23T18:42:01.421Z',
    },
    {
        _id: '6a3b0000aaaa000000000002',
        actor: { _id: FIXED.adminMod, displayName: 'Sam (moderator)' },
        actorRole: 'MODERATOR',
        action: 'kyc.resync',
        targetModel: 'User',
        targetId: FIXED.userJoiner,
        reason: 'User pinged support — verdict never landed',
        dryRun: false,
        result: 'APPLIED',
        webhookEventId: null,
        createdAt: '2026-06-23T17:11:43.001Z',
    },
    {
        _id: '6a3b0000aaaa000000000003',
        actor: { _id: FIXED.adminMgr, displayName: 'Alex (manager)' },
        actorRole: 'MANAGER',
        action: 'transaction.force_status',
        targetModel: 'Transaction',
        targetId: FIXED.txnA,
        reason: '(preview only — not applied)',
        dryRun: true,
        result: 'PREVIEW',
        webhookEventId: null,
        createdAt: '2026-06-23T16:08:55.998Z',
    },
]

// ─── Timeline (unified feed) ────────────────────────────────────────

export const mockUserTimeline: Array<TimelineEvent> = [
    {
        id: 'tl-1',
        kind: 'application',
        at: '2026-06-23T07:59:27.605Z',
        summary: 'Applied to "P2J TESTING REFUND" — 50 THB',
        payload: {
            applicationId: 'app-1',
            planId: FIXED.planAerobic,
            planTitle: 'P2J TESTING REFUND',
            status: 'PENDING',
            expiredReason: null,
        },
    },
    {
        id: 'tl-2',
        kind: 'webhook',
        at: '2026-06-23T08:00:53.694Z',
        summary: 'Xendit payment.capture → PROCESSED (156ms)',
        payload: mockWebhookEvents[0]!,
    },
    {
        id: 'tl-3',
        kind: 'transaction',
        at: '2026-06-23T08:00:53.700Z',
        summary: 'PLAN txn 6a3a3cdf… → COMPLETED (escrow PENDING)',
        payload: {
            transactionId: FIXED.txnA,
            status: 'COMPLETED',
            escrowReleaseStatus: 'PENDING',
            amount: 58.5,
            currency: 'THB',
        },
    },
    {
        id: 'tl-4',
        kind: 'notification',
        at: '2026-06-23T08:00:53.851Z',
        summary: 'Receipt email sent',
        payload: { type: 'PAYMENT', title: 'Application Received', channel: 'email' },
    },
    {
        id: 'tl-5',
        kind: 'application',
        at: '2026-06-23T08:12:50.285Z',
        summary: 'Application auto-expired (host inaction 7d) — refund issued',
        payload: {
            applicationId: 'app-1',
            planId: FIXED.planAerobic,
            planTitle: 'P2J TESTING REFUND',
            status: 'WITHDRAWN',
            expiredReason: 'HOST_INACTION_7D',
        },
    },
    {
        id: 'tl-6',
        kind: 'audit',
        at: '2026-06-23T17:11:43.001Z',
        summary: 'kyc.resync applied by Sam (moderator)',
        payload: mockAuditEntries[1]!,
    },
]

// ─── Remediation context (drives RemediationPanel) ──────────────────

export const mockTxnRemediationContext: RemediationContext = {
    targetModel: 'Transaction',
    targetId: FIXED.txnA,
    summary:
        'Payment confirmed at Xendit but our verification failed (config issue).',
    divergence: {
        dbValue: 'PROCESSING (12 min)',
        providerValue: 'SUCCEEDED',
        cause: 'token_mismatch',
    },
    actions: [
        { key: 'replay_webhook', label: 'Reprocess event', minRole: 'MANAGER', recommended: true },
        { key: 'reconcile_transaction', label: 'Sync from Xendit', minRole: 'MANAGER', recommended: false },
        { key: 'force_transaction_status', label: 'Force status', minRole: 'ADMIN', recommended: false },
    ],
}

export const mockUserRemediationContext: RemediationContext = {
    targetModel: 'User',
    targetId: FIXED.userJoiner,
    summary: 'ID check verdict never arrived from Sumsub.',
    actions: [
        { key: 'resync_kyc', label: 'Re-pull from Sumsub', minRole: 'MODERATOR', recommended: true },
        { key: 'allow_kyc_resubmit', label: 'Allow resubmit', minRole: 'MODERATOR', recommended: false },
    ],
}

export { FIXED as MOCK_IDS }
