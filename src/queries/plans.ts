import { queryOptions } from '@tanstack/react-query'
import type {
  PlanSearchParams,
  SuspendAndRefundPlanResponse,
} from '@/server/api/plans'
import {
  getPlanById,
  getPlanCategories,
  searchPlans,
  suspendAndRefundPlan,
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

export const getPlanCategoriesOptions = () =>
  queryOptions({
    queryKey: ['plan-categories'],
    queryFn: async () => {
      return await getPlanCategories()
    },
    staleTime: Infinity,
  })

export const suspendAndRefundPlanOptions = (planId: string) => ({
  mutationKey: ['plans', 'suspend-and-refund', planId],
  mutationFn: async (reason: string): Promise<SuspendAndRefundPlanResponse> => {
    // @ts-expect-error - createServerFn types don't properly reflect POST data parameter
    return await suspendAndRefundPlan({ data: { planId, reason } })
  },
})
