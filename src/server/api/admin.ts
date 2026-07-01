import { createServerFn } from '@tanstack/react-start'
import { apiClient } from '../client'

export interface AdminTicketStats {
  unassigned?: number
  breachedSLA?: number
  [status: string]: number | undefined
}

export interface AdminDisputeStats {
  active: number
  frozenEscrow: Record<string, number>
}

export interface AdminWorkloadEntry {
  _id: string
  openTickets: number
  name: string
  role: string
}

export interface AdminStatsData {
  tickets: AdminTicketStats
  disputes: AdminDisputeStats
  users: Record<string, number>
  moderation: { suspendedPlans: number }
  totalRevenue: Record<string, number>
  workload: Array<AdminWorkloadEntry>
  // Phase 6 — crisis console attention counters.
  // `total` = open AUTO-origin ticket count; `byRule` breaks it down
  // by autoRule slug (e.g. `payment_stuck_processing`) so the
  // dashboard can render "5 stuck payments · 2 KYC unsynced …".
  attention?: {
    total: number
    byRule: Record<string, number>
  }
}

export interface AdminStatsResponse {
  success: boolean
  data: AdminStatsData
}

export const getAdminStats = createServerFn({
  method: 'GET',
}).handler(async () => {
  return await apiClient.get<AdminStatsResponse>('/admin/stats')
})

// ── Engagement funnel (Phase 3) ─────────────────────────────────────
// Behavioural stage counts backfilled by `GET /admin/stats/funnel`.
// Created/Activated are derived client-side from `/admin/stats`; this
// endpoint fills the deeper arrows. `exploring` is null until profile
// views are instrumented (Phase 6).
export interface EngagementFunnelData {
  exploring: number | null
  initiating: number
  connecting: number
  retained7d: number
  retained30d: number
}

export interface EngagementFunnelResponse {
  success: boolean
  data: EngagementFunnelData
}

export const getEngagementFunnel = createServerFn({
  method: 'GET',
}).handler(async () => {
  return await apiClient.get<EngagementFunnelResponse>('/admin/stats/funnel')
})

// ── Activity segments (Phase 4) ─────────────────────────────────────
// Mutually-exclusive last-login recency buckets from
// `GET /admin/stats/segments` — the retention lens. The measured buckets
// sum to `total`; `daily` ("very active") is null until per-day login
// history is instrumented (Phase 6).
export interface ActivitySegmentsData {
  total: number
  daily: number | null
  weekly: number
  monthly: number
  dormant: number
  churned: number
  neverLoggedIn: number
}

export interface ActivitySegmentsResponse {
  success: boolean
  data: ActivitySegmentsData
}

export const getActivitySegments = createServerFn({
  method: 'GET',
}).handler(async () => {
  return await apiClient.get<ActivitySegmentsResponse>('/admin/stats/segments')
})

// ── Cohort funnel (Phase 5) ─────────────────────────────────────────
// Signup-week cohorts with the share of each that reached a funnel stage
// *within N days of signup* — the age-controlled drop-off diagnostic
// (§7 view 2). `complete` flags cohorts that have had the full window to
// mature; younger cohorts are still in progress.
export type CohortWindow = '7' | '14' | '30'

export interface CohortFunnelParams {
  window?: CohortWindow
  weeks?: number
}

export interface CohortFunnelCohort {
  cohortWeek: string
  created: number
  activated: number
  initiating: number
  connecting: number
  complete: boolean
}

export interface CohortFunnelResponse {
  success: boolean
  data: {
    windowDays: number
    weeks: number
    cohorts: Array<CohortFunnelCohort>
  }
}

export const getCohortFunnel = createServerFn({
  method: 'GET',
}).handler(async (ctx) => {
  const params = (ctx.data ?? {}) as CohortFunnelParams
  const search = new URLSearchParams()
  if (params.window) search.set('window', params.window)
  if (params.weeks) search.set('weeks', String(params.weeks))
  const qs = search.toString()
  return await apiClient.get<CohortFunnelResponse>(
    `/admin/stats/cohorts${qs ? `?${qs}` : ''}`,
  )
})

export type StatsRange = '7d' | '30d' | '3m'

export interface PlansTimeseriesParams {
  range?: StatsRange
}

export interface PlansTimeseriesBucket {
  date: string
  count: number
}

export interface PlansTimeseriesResponse {
  success: boolean
  data: {
    range: string
    buckets: Array<PlansTimeseriesBucket>
  }
}

export const getPlansTimeseries = createServerFn({
  method: 'GET',
}).handler(async (ctx) => {
  const params = (ctx.data ?? {}) as PlansTimeseriesParams
  const search = new URLSearchParams()
  if (params.range) search.set('range', params.range)
  const qs = search.toString()
  return await apiClient.get<PlansTimeseriesResponse>(
    `/admin/stats/plans-timeseries${qs ? `?${qs}` : ''}`,
  )
})

export type TransactionsMetric = 'revenue' | 'volume' | 'count'

export interface TransactionsTimeseriesParams {
  range?: StatsRange
  metric?: TransactionsMetric
  currency?: string
}

export interface TransactionsTimeseriesBucket {
  date: string
  amount: number
}

export interface TransactionsTimeseriesResponse {
  success: boolean
  data: {
    range: string
    metric: string
    currency: string
    buckets: Array<TransactionsTimeseriesBucket>
  }
}

export const getTransactionsTimeseries = createServerFn({
  method: 'GET',
}).handler(async (ctx) => {
  const params = (ctx.data ?? {}) as TransactionsTimeseriesParams
  const search = new URLSearchParams()
  if (params.range) search.set('range', params.range)
  if (params.metric) search.set('metric', params.metric)
  if (params.currency) search.set('currency', params.currency)
  const qs = search.toString()
  return await apiClient.get<TransactionsTimeseriesResponse>(
    `/admin/stats/transactions-timeseries${qs ? `?${qs}` : ''}`,
  )
})
