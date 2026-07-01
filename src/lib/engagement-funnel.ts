/**
 * Engagement funnel — Phase 1 derivation.
 *
 * The top of the lifecycle funnel (`Created → Activated`) is derivable *today*
 * from the account-status counts that `GET /admin/stats` already returns
 * (`users: Record<status, number>`). No new backend endpoint is required.
 *
 * The deeper stages (Exploring / Initiating / Connecting / Retained) need
 * behavioural aggregates from `beens-api` and land in later phases. They are
 * represented here with `count: null` so the UI can render them as
 * "awaiting instrumentation" rather than as a misleading zero.
 *
 * Account statuses come from `beens-api` `userOptions.STATUS`:
 * INCOMPLETE / UNVERIFIED / ACTIVE / ESCALATED / DISABLED / PENDING_DELETE.
 */

export type UserStatusCounts = Record<string, number>

/**
 * Statuses that mean the account never finished signing up, so it never
 * "activated". `INCOMPLETE` is the signup-abandonment bucket the API exposes
 * (see `user.unstick_incomplete` admin action). Everything else represents an
 * account that got past signup at least once — which is what the snapshot
 * funnel's "ever reached Activated" semantics require (§7 view 1).
 */
export const NON_ACTIVATED_STATUSES = ['INCOMPLETE'] as const

export const USER_STATUS_LABELS: Record<string, string> = {
  INCOMPLETE: 'Incomplete signup',
  UNVERIFIED: 'Unverified',
  ACTIVE: 'Active',
  ESCALATED: 'Escalated',
  DISABLED: 'Disabled',
  PENDING_DELETE: 'Pending delete',
}

const sumCounts = (counts: UserStatusCounts): number =>
  Object.values(counts).reduce((acc, n) => acc + (n ?? 0), 0)

export interface ActivationSnapshot {
  totalUsers: number
  activatedUsers: number
  notActivatedUsers: number
  /** activatedUsers / totalUsers, in [0, 1]; 0 when there are no users. */
  activationRate: number
}

/** Derive the Created → Activated arrow from account-status counts. */
export function deriveActivation(counts: UserStatusCounts): ActivationSnapshot {
  const totalUsers = sumCounts(counts)
  const notActivatedUsers = NON_ACTIVATED_STATUSES.reduce(
    (acc, status) => acc + (counts[status] ?? 0),
    0,
  )
  const activatedUsers = totalUsers - notActivatedUsers
  const activationRate = totalUsers === 0 ? 0 : activatedUsers / totalUsers
  return { totalUsers, activatedUsers, notActivatedUsers, activationRate }
}

export interface StatusBreakdownRow {
  status: string
  label: string
  count: number
  /** share of all accounts, in [0, 1] */
  share: number
}

/** Per-status rows for the supporting breakdown, biggest first. */
export function buildStatusBreakdown(
  counts: UserStatusCounts,
): Array<StatusBreakdownRow> {
  const total = sumCounts(counts)
  return Object.entries(counts)
    .map(([status, count]) => ({
      status,
      label: USER_STATUS_LABELS[status] ?? status,
      count,
      share: total === 0 ? 0 : count / total,
    }))
    .sort((a, b) => b.count - a.count)
}

export interface FunnelStage {
  key: string
  label: string
  description: string
  /** null = not yet instrumented (a later phase fills this in). */
  count: number | null
  /** Conversion from the previous stage, in [0, 1]; null when unknown. */
  conversionFromPrev: number | null
}

/**
 * The full lifecycle funnel (§2). Phase 1 populates Created + Activated from
 * real data; deeper stages are `null` placeholders until their backend
 * aggregates exist.
 */
export function buildFunnelStages(
  snapshot: ActivationSnapshot,
): Array<FunnelStage> {
  return [
    {
      key: 'created',
      label: 'Created',
      description: 'Accounts that exist',
      count: snapshot.totalUsers,
      conversionFromPrev: null,
    },
    {
      key: 'activated',
      label: 'Activated',
      description: 'Finished signup (not incomplete)',
      count: snapshot.activatedUsers,
      conversionFromPrev: snapshot.activationRate,
    },
    {
      key: 'exploring',
      label: 'Exploring',
      description: 'Viewed another profile — Phase 2',
      count: null,
      conversionFromPrev: null,
    },
    {
      key: 'initiating',
      label: 'Initiating',
      description: 'Sent a DM request or plan application — Phase 2',
      count: null,
      conversionFromPrev: null,
    },
    {
      key: 'connecting',
      label: 'Connecting',
      description: 'Got a reply or a plan accepted — Phase 2',
      count: null,
      conversionFromPrev: null,
    },
    {
      key: 'retained',
      label: 'Retained',
      description: 'Came back (7d / 30d) — Phase 3',
      count: null,
      conversionFromPrev: null,
    },
  ]
}
