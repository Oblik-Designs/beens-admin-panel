import { queryOptions } from '@tanstack/react-query'
import { searchPlans, type PlanSearchParams } from '@/server/api/plans'

export const searchPlansOptions = (params?: PlanSearchParams) =>
  queryOptions({
    queryKey: ['plans', 'search', params],
    queryFn: async () => {
      // @ts-expect-error - createServerFn types don't properly reflect POST data parameter
      return await searchPlans({ data: params })
    },
  })
