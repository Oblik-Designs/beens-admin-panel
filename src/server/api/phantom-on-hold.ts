import { createServerFn } from '@tanstack/react-start'
import { apiClient } from '../client'

/**
 * Phase 9 — Phantom On-Hold cohort (see ADMIN_CRISIS_CONSOLE_PLAN.md §16.6).
 *
 * Server-fn wrapper for `GET /admin/phantom-on-hold` (MODERATOR+). The
 * endpoint returns the live cohort of hosts hit by the phantom "On Hold"
 * bug (BNS-84): one row per affected host, `status` deriving from whether
 * the FAILED parent txn still has un-reversed splits (OPEN) or not
 * (RESOLVED) — so the cohort self-updates as hosts are cleared via the
 * per-host 360 Resolve.
 */

export type PhantomOnHoldStatus = 'OPEN' | 'RESOLVED'

export interface PhantomOnHoldRow {
    hostName: string
    email: string
    userId: string
    txnId: string
    amount: number
    currency: string
    plan: string
    status: PhantomOnHoldStatus
}

interface PhantomOnHoldResponse {
    success: boolean
    // The endpoint returns the cohort array. Tolerate either a bare array
    // or the standard `{ success, data }` envelope used elsewhere — the
    // query layer normalises both.
    data: Array<PhantomOnHoldRow>
}

export const getPhantomOnHold = createServerFn({ method: 'GET' }).handler(
    async () => {
        const res = await apiClient.get<
            PhantomOnHoldResponse | Array<PhantomOnHoldRow>
        >('/admin/phantom-on-hold')
        // Normalise: bare array → envelope.
        if (Array.isArray(res)) {
            return { success: true, data: res } satisfies PhantomOnHoldResponse
        }
        return res
    },
)
