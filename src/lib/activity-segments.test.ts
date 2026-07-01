import { describe, expect, it } from 'vitest'

import { buildActivitySegments } from '@/lib/activity-segments'

// Phase 4 — the retention lens. `GET /admin/stats/segments` returns
// mutually-exclusive last-login buckets that sum to the user base; these
// pin the share-of-base math and the still-null "very active" bucket.

describe('buildActivitySegments', () => {
  it('computes each bucket as a share of the total user base', () => {
    const rows = buildActivitySegments({
      total: 100,
      daily: null,
      weekly: 40,
      monthly: 25,
      dormant: 20,
      churned: 10,
      neverLoggedIn: 5,
    })
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]))

    expect(byKey.weekly.count).toBe(40)
    expect(byKey.weekly.share).toBeCloseTo(0.4)
    expect(byKey.monthly.share).toBeCloseTo(0.25)
    expect(byKey.dormant.share).toBeCloseTo(0.2)
    expect(byKey.churned.share).toBeCloseTo(0.1)
    expect(byKey.neverLoggedIn.share).toBeCloseTo(0.05)
  })

  it('keeps the measured buckets summing to the total', () => {
    const data = {
      total: 100,
      daily: null,
      weekly: 40,
      monthly: 25,
      dormant: 20,
      churned: 10,
      neverLoggedIn: 5,
    }
    const rows = buildActivitySegments(data)
    const measured = rows
      .filter((r) => r.key !== 'daily' && r.count !== null)
      .reduce((acc, r) => acc + (r.count ?? 0), 0)
    expect(measured).toBe(data.total)
  })

  it('leaves the "very active" bucket pending (no fake zero)', () => {
    const rows = buildActivitySegments({
      total: 100,
      daily: null,
      weekly: 40,
      monthly: 25,
      dormant: 20,
      churned: 10,
      neverLoggedIn: 5,
    })
    const daily = rows.find((r) => r.key === 'daily')!
    expect(daily.count).toBeNull()
    expect(daily.share).toBeNull()
  })

  it('preserves the most-active → least-active ordering', () => {
    const rows = buildActivitySegments(null)
    expect(rows.map((r) => r.key)).toEqual([
      'daily',
      'weekly',
      'monthly',
      'dormant',
      'churned',
      'neverLoggedIn',
    ])
  })

  it('is safe with no data — every bucket is null', () => {
    const rows = buildActivitySegments(undefined)
    for (const row of rows) {
      expect(row.count).toBeNull()
      expect(row.share).toBeNull()
    }
  })

  it('does not divide by zero on an empty user base', () => {
    const rows = buildActivitySegments({
      total: 0,
      daily: null,
      weekly: 0,
      monthly: 0,
      dormant: 0,
      churned: 0,
      neverLoggedIn: 0,
    })
    const weekly = rows.find((r) => r.key === 'weekly')!
    expect(weekly.count).toBe(0)
    expect(weekly.share).toBe(0)
  })
})
