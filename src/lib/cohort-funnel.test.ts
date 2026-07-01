import { describe, expect, it } from 'vitest'

import { buildCohortRows } from '@/lib/cohort-funnel'
import type { CohortFunnelCohort } from '@/lib/cohort-funnel'

// Phase 5 — the age-controlled cohort funnel. `GET /admin/stats/cohorts`
// returns per-signup-week stage counts reached within N days; these pin the
// share-of-cohort rate math, the empty-cohort guard, and pass-through of the
// `complete` maturity flag.

const cohort = (over: Partial<CohortFunnelCohort> = {}): CohortFunnelCohort => ({
  cohortWeek: '2026-06-01',
  created: 100,
  activated: 80,
  initiating: 40,
  connecting: 25,
  complete: true,
  ...over,
})

describe('buildCohortRows', () => {
  it('computes each stage rate as a share of the cohort size', () => {
    const [row] = buildCohortRows([cohort()])
    expect(row.activatedRate).toBeCloseTo(0.8)
    expect(row.initiatingRate).toBeCloseTo(0.4)
    expect(row.connectingRate).toBeCloseTo(0.25)
  })

  it('passes the raw counts and the maturity flag straight through', () => {
    const [row] = buildCohortRows([cohort({ complete: false })])
    expect(row.cohortWeek).toBe('2026-06-01')
    expect(row.created).toBe(100)
    expect(row.connecting).toBe(25)
    expect(row.complete).toBe(false)
  })

  it('yields null rates for an empty cohort (no divide-by-zero)', () => {
    const [row] = buildCohortRows([
      cohort({ created: 0, activated: 0, initiating: 0, connecting: 0 }),
    ])
    expect(row.activatedRate).toBeNull()
    expect(row.initiatingRate).toBeNull()
    expect(row.connectingRate).toBeNull()
  })

  it('is safe on missing/empty input', () => {
    expect(buildCohortRows(undefined)).toEqual([])
    expect(buildCohortRows(null)).toEqual([])
    expect(buildCohortRows([])).toEqual([])
  })

  it('preserves cohort order', () => {
    const rows = buildCohortRows([
      cohort({ cohortWeek: '2026-06-08' }),
      cohort({ cohortWeek: '2026-06-01' }),
    ])
    expect(rows.map((r) => r.cohortWeek)).toEqual(['2026-06-08', '2026-06-01'])
  })
})
