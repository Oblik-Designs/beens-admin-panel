import { queryOptions } from '@tanstack/react-query'
import type {
  CohortWindow,
  StatsRange,
  TransactionsMetric,
} from '@/server/api/admin'
import {
  getActivitySegments,
  getAdminStats,
  getCohortFunnel,
  getEngagementFunnel,
  getPlansTimeseries,
  getTransactionsTimeseries,
} from '@/server/api/admin'

export const getAdminStatsOptions = queryOptions({
  queryKey: ['admin', 'stats'],
  queryFn: async () => {
    return await getAdminStats()
  },
})

export const getEngagementFunnelOptions = queryOptions({
  queryKey: ['admin', 'stats', 'funnel'],
  queryFn: async () => {
    return await getEngagementFunnel()
  },
})

export const getActivitySegmentsOptions = queryOptions({
  queryKey: ['admin', 'stats', 'segments'],
  queryFn: async () => {
    return await getActivitySegments()
  },
})

export const cohortFunnelOptions = (window: CohortWindow = '30') =>
  queryOptions({
    queryKey: ['admin', 'stats', 'cohorts', window],
    queryFn: async () => {
      const data = { window }
      // @ts-expect-error - createServerFn types don't properly reflect data parameter
      return await getCohortFunnel({ data })
    },
  })

export const plansTimeseriesOptions = (range: StatsRange) =>
  queryOptions({
    queryKey: ['admin', 'stats', 'plans-timeseries', range],
    queryFn: async () => {
      const data = { range }
      // @ts-expect-error - createServerFn types don't properly reflect data parameter
      return await getPlansTimeseries({ data })
    },
  })

export const transactionsTimeseriesOptions = (
  range: StatsRange,
  metric: TransactionsMetric = 'revenue',
  currency = 'THB',
) =>
  queryOptions({
    queryKey: [
      'admin',
      'stats',
      'transactions-timeseries',
      range,
      metric,
      currency,
    ],
    queryFn: async () => {
      const data = { range, metric, currency }
      // @ts-expect-error - createServerFn types don't properly reflect data parameter
      return await getTransactionsTimeseries({ data })
    },
  })
