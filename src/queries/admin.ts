import { queryOptions } from '@tanstack/react-query'
import type { StatsRange, TransactionsMetric } from '@/server/api/admin'
import {
  getAdminStats,
  getPlansTimeseries,
  getTransactionsTimeseries,
} from '@/server/api/admin'

export const getAdminStatsOptions = queryOptions({
  queryKey: ['admin', 'stats'],
  queryFn: async () => {
    return await getAdminStats()
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
