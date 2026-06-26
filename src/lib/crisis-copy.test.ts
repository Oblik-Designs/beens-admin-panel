import { describe, expect, it } from 'vitest'

import { canApply } from '@/lib/crisis-copy'
import type { AdminRole } from '@/types/crisis'

// Phase 8 — role-aware gating. `canApply` is the single predicate behind the
// disabled/tooltip state on every remediation button, so its rank ordering is
// worth pinning down.

const ORDER: AdminRole[] = ['USER', 'MODERATOR', 'MANAGER', 'ADMIN', 'SUPERADMIN']

describe('canApply — role ranking', () => {
    it('allows a role to apply an action at or below its own rank', () => {
        ORDER.forEach((actor, ai) => {
            ORDER.forEach((min, mi) => {
                expect(canApply(actor, min)).toBe(ai >= mi)
            })
        })
    })

    it('SUPERADMIN can apply everything', () => {
        ORDER.forEach((min) => expect(canApply('SUPERADMIN', min)).toBe(true))
    })

    it('USER can apply nothing above USER', () => {
        expect(canApply('USER', 'MODERATOR')).toBe(false)
        expect(canApply('USER', 'ADMIN')).toBe(false)
        expect(canApply('USER', 'USER')).toBe(true)
    })

    it('gates force_transaction_status (ADMIN) below ADMIN', () => {
        // The force-status action ships with minRole ADMIN — MANAGER and below
        // must see it disabled.
        expect(canApply('MANAGER', 'ADMIN')).toBe(false)
        expect(canApply('ADMIN', 'ADMIN')).toBe(true)
        expect(canApply('SUPERADMIN', 'ADMIN')).toBe(true)
    })
})
