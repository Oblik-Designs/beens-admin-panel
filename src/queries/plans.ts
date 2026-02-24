import { queryOptions } from '@tanstack/react-query'
import {
  searchPlans,
  type PlanSearchParams,
  getPlanById,
} from '@/server/api/plans'

export const searchPlansOptions = (params?: PlanSearchParams) =>
  queryOptions({
    queryKey: ['plans', 'search', params],
    queryFn: async () => {
      // @ts-expect-error - createServerFn types don't properly reflect POST data parameter
      return await searchPlans({ data: params })
    },
  })

export const getPlanByIdOptions = (planId: string) =>
  queryOptions({
    queryKey: ['plans', 'detail', planId],
    queryFn: async () => {
      // @ts-expect-error - createServerFn types don't properly reflect GET data parameter
      return await getPlanById({ data: { planId } })
    },
  })
