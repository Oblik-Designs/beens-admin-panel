import { describe, expect, it } from 'vitest'

import {
  buildFunnelStages,
  buildStatusBreakdown,
  deriveActivation,
} from '@/lib/engagement-funnel'

// Phase 1 — the Created → Activated arrow is derived purely from the
// account-status counts `GET /admin/stats` already returns. These pin the
// "activated = every status except INCOMPLETE" rule and the empty-base guard.

describe('deriveActivation', () => {
  it('treats every non-INCOMPLETE status as activated', () => {
    const snapshot = deriveActivation({
      INCOMPLETE: 20,
      UNVERIFIED: 10,
      ACTIVE: 65,
      DISABLED: 5,
    })
    expect(snapshot.totalUsers).toBe(100)
    expect(snapshot.notActivatedUsers).toBe(20)
    expect(snapshot.activatedUsers).toBe(80)
    expect(snapshot.activationRate).toBeCloseTo(0.8)
  })

  it('is safe on an empty user base (no divide-by-zero)', () => {
    const snapshot = deriveActivation({})
    expect(snapshot.totalUsers).toBe(0)
    expect(snapshot.activatedUsers).toBe(0)
    expect(snapshot.activationRate).toBe(0)
  })
})

describe('buildStatusBreakdown', () => {
  it('sorts by count desc and computes each status share', () => {
    const rows = buildStatusBreakdown({ INCOMPLETE: 20, ACTIVE: 80 })
    expect(rows[0].status).toBe('ACTIVE')
    expect(rows[0].share).toBeCloseTo(0.8)
    expect(rows[0].label).toBe('Active')
    expect(rows[1].status).toBe('INCOMPLETE')
    expect(rows[1].label).toBe('Incomplete signup')
  })

  it('falls back to the raw status key for unknown statuses', () => {
    const rows = buildStatusBreakdown({ SOMETHING_NEW: 3 })
    expect(rows[0].label).toBe('SOMETHING_NEW')
  })
})

describe('buildFunnelStages', () => {
  it('fills Created/Activated and leaves deeper stages pending without behavior', () => {
    const stages = buildFunnelStages(
      deriveActivation({ INCOMPLETE: 20, ACTIVE: 80 }),
    )
    const byKey = Object.fromEntries(stages.map((s) => [s.key, s]))

    expect(byKey.created.count).toBe(100)
    expect(byKey.activated.count).toBe(80)
    expect(byKey.activated.conversionFromPrev).toBeCloseTo(0.8)
    // Deeper stages are explicitly null so the UI can show "awaiting
    // instrumentation" instead of a fake zero.
    expect(byKey.exploring.count).toBeNull()
    expect(byKey.initiating.count).toBeNull()
    expect(byKey.retained.count).toBeNull()
  })

  // Phase 3 — the behavioural endpoint fills Initiating/Connecting/Retained.
  it('fills behavioural stages from the funnel endpoint as share-of-created', () => {
    const stages = buildFunnelStages(
      deriveActivation({ INCOMPLETE: 20, ACTIVE: 80 }),
      {
        exploring: null,
        initiating: 40,
        connecting: 25,
        retained7d: 10,
        retained30d: 18,
      },
    )
    const byKey = Object.fromEntries(stages.map((s) => [s.key, s]))

    expect(byKey.initiating.count).toBe(40)
    expect(byKey.initiating.conversionFromPrev).toBeCloseTo(0.4)
    expect(byKey.connecting.count).toBe(25)
    expect(byKey.connecting.conversionFromPrev).toBeCloseTo(0.25)
    // Retained shows the 7-day figure against the created base.
    expect(byKey.retained.count).toBe(10)
    expect(byKey.retained.conversionFromPrev).toBeCloseTo(0.1)
    // Exploring stays pending — profile views aren't persisted yet.
    expect(byKey.exploring.count).toBeNull()
    expect(byKey.exploring.conversionFromPrev).toBeNull()
  })
})
