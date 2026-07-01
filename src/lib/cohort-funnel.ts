/**
 * Cohort funnel — Phase 5 (§7 view 2).
 *
 * `GET /admin/stats/cohorts` returns, per signup week, how many users reached
 * each funnel stage *within N days of their own signup*. This module turns
 * those raw counts into display rows with a stage-reach rate (share of the
 * cohort), kept as a pure, unit-tested function so the route stays a thin
 * renderer.
 *
 * Every rate is a share of the cohort's `created` size — so a cohort reads as
 * "X% activated, Y% initiated, Z% connected, all within N days of signup".
 * `complete` (passed through from the API) marks cohorts old enough to have
 * had the full window; younger cohorts are still maturing and must not be
 * read as drop-off.
 */

export interface CohortFunnelCohort {
  cohortWeek: string
  created: number
  activated: number
  initiating: number
  connecting: number
  complete: boolean
}

export interface CohortRow extends CohortFunnelCohort {
  /** Share of the cohort that reached the stage; null when the cohort is empty. */
  activatedRate: number | null
  initiatingRate: number | null
  connectingRate: number | null
}

const rate = (count: number, created: number): number | null =>
  created === 0 ? null : count / created

/** Build display rows (counts + share-of-cohort rates) from the API cohorts. */
export function buildCohortRows(
  cohorts: Array<CohortFunnelCohort> | null | undefined,
): Array<CohortRow> {
  return (cohorts ?? []).map((c) => ({
    ...c,
    activatedRate: rate(c.activated, c.created),
    initiatingRate: rate(c.initiating, c.created),
    connectingRate: rate(c.connecting, c.created),
  }))
}
