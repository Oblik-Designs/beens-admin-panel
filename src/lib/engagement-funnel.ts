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
  /** Share of all created accounts, in [0, 1]; null when the stage is unknown. */
  conversionFromPrev: number | null
}

/**
 * Behavioural stage counts from `GET /admin/stats/funnel` (Phase 3). Every
 * field is a distinct-user count except `exploring`, which is null until
 * profile views are instrumented (Phase 6).
 */
export interface FunnelBehavior {
  exploring: number | null
  initiating: number
  connecting: number
  retained7d: number
  retained30d: number
}

/** Share of created accounts, in [0, 1]; null when count/total is unknown. */
const shareOfCreated = (
  count: number | null,
  total: number,
): number | null => {
  if (count === null) return null
  return total === 0 ? 0 : count / total
}

/**
 * The full lifecycle funnel (§2).
 *
 * - Created + Activated come from the account-status snapshot (Phase 1).
 * - Initiating / Connecting / Retained are filled from `behavior` when the
 *   Phase 3 funnel endpoint has responded; otherwise they stay `null`
 *   ("awaiting instrumentation").
 * - Exploring stays `null` until profile views are persisted (Phase 6).
 */
export function buildFunnelStages(
  snapshot: ActivationSnapshot,
  behavior?: FunnelBehavior | null,
): Array<FunnelStage> {
  const total = snapshot.totalUsers
  const exploring = behavior?.exploring ?? null
  const initiating = behavior?.initiating ?? null
  const connecting = behavior?.connecting ?? null
  const retained = behavior?.retained7d ?? null

  return [
    {
      key: 'created',
      label: 'Created',
      description: 'Accounts that exist',
      count: total,
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
      description: 'Viewed another profile — awaiting instrumentation',
      count: exploring,
      conversionFromPrev: shareOfCreated(exploring, total),
    },
    {
      key: 'initiating',
      label: 'Initiating',
      description: 'Sent a DM request or plan application',
      count: initiating,
      conversionFromPrev: shareOfCreated(initiating, total),
    },
    {
      key: 'connecting',
      label: 'Connecting',
      description: 'Got a reply or a plan accepted',
      count: connecting,
      conversionFromPrev: shareOfCreated(connecting, total),
    },
    {
      key: 'retained',
      label: 'Retained',
      description: 'Connected and active in the last 7 days',
      count: retained,
      conversionFromPrev: shareOfCreated(retained, total),
    },
  ]
}
