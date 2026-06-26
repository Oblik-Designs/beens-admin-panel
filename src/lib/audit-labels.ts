/**
 * Maps admin-audit `action` keys (as written by `AdminAudit.record` in
 * the API) to short human-readable labels for the User/Plan/Transaction
 * 360 timelines.
 *
 * Keep entries in sync with the API. New endpoints land here as part of
 * the panel-side PR, not as a separate follow-up.
 *
 * The dotted format (`user.ban`, `plan.suspend`) is the convention going
 * forward (Phase 5 and later); the snake_case keys (`account_banned`,
 * `plan_status_updated`) are legacy Phase 2 retrofit values that some
 * endpoints still emit alongside the new ones — they're listed here so
 * historical rows render the same as new ones.
 */

const AUDIT_ACTION_LABELS: Record<string, string> = {
    // ── Phase 2 retrofit ─────────────────────────────────────────────
    "user.ban": "Ban user",
    "user.unban": "Unban user",
    "user.update_role": "Change user role",
    "plan.suspend": "Suspend plan",
    "plan.unsuspend": "Unsuspend plan",
    "plan.suspend_and_refund": "Suspend & refund plan",
    "plan.set_status": "Set plan status",
    "plan.set_schedule": "Update plan schedule",
    "plan.mark_participant": "Mark participant",
    "plan.issue_start_code": "Issue start code",
    "plan.issue_end_code": "Issue end code",
    "plan.resend_start_code": "Resend start code",
    "plan.resend_end_code": "Resend end code",

    // ── Phase 2 retrofit (legacy snake_case duplicates) ──────────────
    account_banned: "Ban user",
    account_unbanned: "Unban user",
    role_changed: "Change user role",
    plan_suspended: "Suspend plan",
    plan_unsuspended: "Unsuspend plan",
    plan_suspended_and_refunded: "Suspend & refund plan",
    plan_status_updated: "Set plan status",

    // ── Phase 5a — webhook replay + transaction reconcile ────────────
    "webhook.replay": "Replay webhook event",
    "transaction.reconcile": "Reconcile transaction (Xendit)",

    // ── Phase 5b — KYC actions ───────────────────────────────────────
    "kyc.resync": "Re-pull KYC from Sumsub",
    "kyc.allow_resubmit": "Allow KYC resubmit",

    // ── Phase 5c — user account fixes ────────────────────────────────
    "user.resend_otp": "Resend OTP",
    "user.verify_contact": "Mark contact verified",
    "user.unstick_incomplete": "Unstick INCOMPLETE signup",
};

/** Render-time label for an audit action. Falls back to the raw key
 * (in monospace at the call site) so unknown actions remain visible. */
export function auditActionLabel(action: string): string {
    return AUDIT_ACTION_LABELS[action] ?? action;
}

export function isKnownAuditAction(action: string): boolean {
    return action in AUDIT_ACTION_LABELS;
}
