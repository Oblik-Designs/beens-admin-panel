/**
 * Plain-language decision table for the Crisis Console.
 *
 * Maps a (businessState + skipReason) signal to:
 *   - the sentence the operator sees (non-technical),
 *   - the recommended remediation action,
 *   - the minimum role required to *apply* it.
 *
 * This file is the artifact to get domain-expert review on — the code
 * around it is mostly plumbing. Update copy here freely; the API side
 * will eventually export a matching `src/shared/crisis-copy.ts` so the
 * panel and the API speak with one voice.
 *
 * Reference: admin-crisis-implementation-plan.md §4 + design plan §7.4.
 */

import type { AdminRole, RemediationActionKey } from '@/types/crisis'

export interface CrisisCopyEntry {
    /** Human key used to look up the entry from a signal. */
    signalKey: string
    /** What the operator sees, plain English. */
    sentence: string
    /** Button label. */
    recommendedActionLabel: string
    /** Which endpoint the button triggers. */
    recommendedAction: RemediationActionKey
    /** Minimum role required to *apply* (preview is open to MODERATOR+). */
    minRole: AdminRole
    /** Optional notes for the in-panel tooltip / help text. */
    notes?: string
}

/**
 * Signal key convention: `<entity>:<state>:<skipReason?>`
 * Examples:
 *   - `transaction:PROCESSING:token_mismatch`
 *   - `transaction:PROCESSING:` (no webhook recorded — Sync from provider)
 *   - `transaction:COMPLETED_NOT_JOINED`
 *   - `user:kyc:PENDING:no_sumsub_processed`
 *   - `user:otp:failed`
 */
export const crisisCopyTable: Record<string, CrisisCopyEntry> = {
    'transaction:PROCESSING:token_mismatch': {
        signalKey: 'transaction:PROCESSING:token_mismatch',
        sentence:
            'Payment confirmed at Xendit but our verification failed (config issue). The money was captured but our books missed it.',
        recommendedActionLabel: 'Reprocess event',
        recommendedAction: 'replay_webhook',
        minRole: 'MANAGER',
        notes:
            "Replays the stored webhook through the same idempotent domain function the handler uses. Safe to re-run — if the txn already completed, it's a no-op.",
    },
    'transaction:PROCESSING:no_webhook': {
        signalKey: 'transaction:PROCESSING:no_webhook',
        sentence:
            "We never heard back from Xendit. The payment may have succeeded — we'll re-pull the truth from Xendit's API.",
        recommendedActionLabel: 'Sync from Xendit',
        recommendedAction: 'reconcile_transaction',
        minRole: 'MANAGER',
        notes:
            'Read-only — fetches the current Xendit session state. Apply step kicks in only if Xendit reports SUCCEEDED.',
    },
    'transaction:COMPLETED_NOT_JOINED': {
        signalKey: 'transaction:COMPLETED_NOT_JOINED',
        sentence:
            'Joiner paid in full but was never added to the plan participants. Likely a race between webhook + enrolment.',
        recommendedActionLabel: 'Replay & force-join',
        recommendedAction: 'replay_webhook',
        minRole: 'MANAGER',
        notes:
            'Replay first; if the participant entry still does not exist after replay, follow up with force_join.',
    },
    'transaction:ESCROW:DISPUTED': {
        signalKey: 'transaction:ESCROW:DISPUTED',
        sentence:
            'Escrow is frozen because of an open dispute. Funds cannot be released until the dispute is resolved.',
        recommendedActionLabel: 'Resolve dispute',
        recommendedAction: 'force_transaction_status',
        minRole: 'ADMIN',
        notes: 'Last-resort manual override. Reason required.',
    },
    'user:kyc:PENDING:no_sumsub_processed': {
        signalKey: 'user:kyc:PENDING:no_sumsub_processed',
        sentence:
            "ID check verdict never arrived from Sumsub. We'll re-pull the applicant status from the provider.",
        recommendedActionLabel: 'Re-pull from Sumsub',
        recommendedAction: 'resync_kyc',
        minRole: 'MODERATOR',
        notes:
            'Pulls the applicant status from Sumsub and applies it. KYC approval still cannot override a moderation ban.',
    },
    'user:kyc:REJECTED:allow_resubmit': {
        signalKey: 'user:kyc:REJECTED:allow_resubmit',
        sentence:
            'KYC was rejected. After review, the user may be allowed to resubmit their documents.',
        recommendedActionLabel: 'Allow resubmit',
        recommendedAction: 'allow_kyc_resubmit',
        minRole: 'MODERATOR',
    },
    'user:otp:failed': {
        signalKey: 'user:otp:failed',
        sentence:
            'Login code never delivered. Twilio/Brevo reported `failed` or `undeliverable` on the last attempt.',
        recommendedActionLabel: 'Resend code',
        recommendedAction: 'resend_otp',
        minRole: 'MODERATOR',
        notes:
            "If resend keeps failing, fall back to 'Mark contact verified' to unblock the user manually.",
    },
    'user:contact:unverified_manual': {
        signalKey: 'user:contact:unverified_manual',
        sentence:
            'Phone or email cannot be verified through the normal flow. Operator may mark it verified after manual confirmation.',
        recommendedActionLabel: 'Verify contact',
        recommendedAction: 'verify_contact',
        minRole: 'MODERATOR',
    },
    'user:signup:incomplete_stuck': {
        signalKey: 'user:signup:incomplete_stuck',
        sentence:
            'Account is stuck at signup. The user filled some fields but never finished. Operator may unstick to a clean ACTIVE state.',
        recommendedActionLabel: 'Unstick signup',
        recommendedAction: 'unstick_incomplete',
        minRole: 'MODERATOR',
    },
    'plan:code:not_generated': {
        signalKey: 'plan:code:not_generated',
        sentence:
            "Plan has started but no start code was generated. The participant can't be checked in until a code is issued.",
        recommendedActionLabel: 'Reissue code',
        recommendedAction: 'reissue_code',
        minRole: 'MANAGER',
    },
    'plan:code:locked_out': {
        signalKey: 'plan:code:locked_out',
        sentence:
            'Participant exceeded the start-code attempt limit and is locked out. Reset the counter to allow another try.',
        recommendedActionLabel: 'Reset attempts',
        recommendedAction: 'reset_code_attempts',
        minRole: 'MODERATOR',
    },
    'plan:participant:force_join': {
        signalKey: 'plan:participant:force_join',
        sentence:
            'Operator can force a paid user into the participant list when normal enrolment failed.',
        recommendedActionLabel: 'Force join',
        recommendedAction: 'force_join',
        minRole: 'MANAGER',
    },
    'plan:participant:mark_status': {
        signalKey: 'plan:participant:mark_status',
        sentence:
            'Operator can override a participant entry status (e.g. mark NO_SHOW as COMPLETED on a verified dispute).',
        recommendedActionLabel: 'Mark status',
        recommendedAction: 'mark_participant_status',
        minRole: 'MANAGER',
        notes: 'Last-resort manual override. Reason required.',
    },
}

/** Resolve a signal key to its copy entry, or `null` if no mapping exists. */
export function getCrisisCopy(signalKey: string): CrisisCopyEntry | null {
    return crisisCopyTable[signalKey] ?? null
}

/** Role hierarchy (low → high). Used by `canApply()`. */
const ROLE_RANK: Record<AdminRole, number> = {
    USER: 0,
    MODERATOR: 1,
    MANAGER: 2,
    ADMIN: 3,
    SUPERADMIN: 4,
}

/** Whether the given role can apply (not just preview) the action. */
export function canApply(actorRole: AdminRole, minRole: AdminRole): boolean {
    return ROLE_RANK[actorRole] >= ROLE_RANK[minRole]
}
