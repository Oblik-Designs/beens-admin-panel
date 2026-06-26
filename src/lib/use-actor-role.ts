import { useQuery } from '@tanstack/react-query'

import { getProfileOptions } from '@/queries/users'
import type { AdminRole } from '@/types/crisis'

const KNOWN_ROLES: ReadonlySet<AdminRole> = new Set([
    'USER',
    'MODERATOR',
    'MANAGER',
    'ADMIN',
    'SUPERADMIN',
])

/**
 * Phase 8 — the live operator's admin role, used to gate remediation actions
 * in the RemediationPanel. Reads the cached `/user/profile` query (shared with
 * the rest of the app) and narrows the raw string to an `AdminRole`.
 *
 * Fails safe: while the profile is loading, or if the role is missing/unknown,
 * returns the lowest role (`USER`) so below-min-role actions stay disabled
 * until we positively know the operator outranks them. Never opens an action
 * the operator isn't entitled to.
 */
export function useActorRole(): AdminRole {
    const { data } = useQuery(getProfileOptions)
    const raw = (data?.data?.role ?? '') as string
    const role = raw.toUpperCase() as AdminRole
    return KNOWN_ROLES.has(role) ? role : 'USER'
}
