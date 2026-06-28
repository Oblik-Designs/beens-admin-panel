import { queryOptions } from '@tanstack/react-query'

import type { PhantomOnHoldRow } from '@/server/api/phantom-on-hold'
import { getPhantomOnHold } from '@/server/api/phantom-on-hold'

/**
 * Phase 9 — Phantom On-Hold cohort query (§16.6).
 *
 * Resolves to `{ success, data: rows }`. The cohort self-updates as hosts
 * are cleared (RESOLVED) via the per-host 360 Resolve, so this stays a
 * plain live query — no client-side caching tricks needed.
 */
export const phantomOnHoldOptions = () =>
    queryOptions({
        queryKey: ['phantom-on-hold'],
        queryFn: async (): Promise<{
            success: boolean
            data: Array<PhantomOnHoldRow>
        }> => {
            const res = await getPhantomOnHold()
            return { success: res.success, data: res.data ?? [] }
        },
    })
