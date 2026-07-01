/**
 * Activity segments — Phase 4 retention lens (§6).
 *
 * The funnel says *where* users drop off on the way in; this says *whether
 * they come back*. `GET /admin/stats/segments` returns mutually-exclusive
 * last-login recency buckets that sum to the whole user base. This module
 * turns that payload into display rows (count + share of the user base),
 * kept as a pure, unit-tested function so the route stays a thin renderer.
 *
 * `daily` ("very active") is null until per-day login history is
 * instrumented (Phase 6) — a single `lastLogin` can't say how many distinct
 * days a user returned. It's rendered as "awaiting instrumentation" and is a
 * subset of `weekly`, which currently absorbs it.
 */

/** Raw payload from `GET /admin/stats/segments`. */
export interface ActivitySegmentsData {
  total: number
  /** null = not yet instrumented (needs per-day login history). */
  daily: number | null
  weekly: number
  monthly: number
  dormant: number
  churned: number
  neverLoggedIn: number
}

export type ActivitySegmentTone =
  | 'positive'
  | 'primary'
  | 'default'
  | 'warning'
  | 'muted'

export interface ActivitySegmentRow {
  key: string
  label: string
  /** The recency window this bucket covers, in plain words. */
  description: string
  /** null = not yet instrumented (a later phase fills this in). */
  count: number | null
  /** Share of the total user base, in [0, 1]; null when count is unknown. */
  share: number | null
  tone: ActivitySegmentTone
}

interface SegmentSpec {
  key: keyof Omit<ActivitySegmentsData, 'total'>
  label: string
  description: string
  tone: ActivitySegmentTone
}

// Ordered most-active → least-active, so the row reads as a decay curve.
const SEGMENT_SPECS: Array<SegmentSpec> = [
  {
    key: 'daily',
    label: 'Very active',
    description: 'Active on ≥6 of the last 7 days',
    tone: 'positive',
  },
  {
    key: 'weekly',
    label: 'Weekly active',
    description: 'Last login within the last 7 days',
    tone: 'primary',
  },
  {
    key: 'monthly',
    label: 'Monthly active',
    description: 'Last login 8–30 days ago',
    tone: 'default',
  },
  {
    key: 'dormant',
    label: 'Dormant',
    description: 'Last login 31–90 days ago',
    tone: 'warning',
  },
  {
    key: 'churned',
    label: 'Churned',
    description: 'No login in over 90 days',
    tone: 'muted',
  },
  {
    key: 'neverLoggedIn',
    label: 'Never logged in',
    description: 'No login recorded yet',
    tone: 'muted',
  },
]

const share = (count: number | null, total: number): number | null => {
  if (count === null) return null
  return total === 0 ? 0 : count / total
}

/**
 * Build the ordered segment rows from the endpoint payload. Every row gets a
 * share of the total user base; the `daily` row stays `null` until per-day
 * login history exists (Phase 6).
 */
export function buildActivitySegments(
  data: ActivitySegmentsData | null | undefined,
): Array<ActivitySegmentRow> {
  const total = data?.total ?? 0
  return SEGMENT_SPECS.map((spec) => {
    const count = data ? data[spec.key] : null
    return {
      key: spec.key,
      label: spec.label,
      description: spec.description,
      count,
      share: share(count, total),
      tone: spec.tone,
    }
  })
}
