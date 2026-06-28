import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import type {
  ForceJoinParams,
  IssuePlanCodeParams,
  MarkParticipantParams,
  PlanCodesResponse,
  PlanSearchParams,
  ResendPlanCodeParams,
  ResetCodeAttemptsParams,
  SetPlanScheduleParams,
  SetPlanStatusParams,
  SuspendAndRefundPlanResponse,
} from '@/server/api/plans'
import {
  forceJoin,
  getPlanById,
  getPlanCategories,
  getPlanCodes,
  issuePlanCode,
  markParticipant,
  resendPlanCode,
  resetCodeAttempts,
  searchPlans,
  setPlanSchedule,
  setPlanStatus,
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

export const PLANS_LIST_BATCH_SIZE = 24

export const searchPlansInfiniteOptions = (
  baseParams: Omit<PlanSearchParams, 'page'>,
  batchSize = PLANS_LIST_BATCH_SIZE,
) =>
  infiniteQueryOptions({
    queryKey: ['plans', 'search', 'infinite', baseParams, batchSize],
    queryFn: async ({ pageParam }) => {
      const params: PlanSearchParams = {
        ...baseParams,
        page: pageParam,
        limit: batchSize,
      }
      // @ts-expect-error - createServerFn types don't properly reflect POST data parameter
      return await searchPlans({ data: params })
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      const batch = lastPage?.data?.plans ?? []
      if (batch.length < batchSize) return undefined

      const pagination = lastPage?.data?.pagination
      const total = pagination?.totalItems ?? 0
      const loaded = allPages.reduce(
        (sum, page) => sum + (page.data?.plans?.length ?? 0),
        0,
      )
      if (total > 0 && loaded >= total) return undefined

      const totalPages = pagination?.totalPages
      if (totalPages != null && lastPageParam >= totalPages) return undefined
      return lastPageParam + 1
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

export const getPlanCodesOptions = (planId: string) =>
  queryOptions({
    queryKey: ['plan', 'codes', planId],
    queryFn: async (): Promise<PlanCodesResponse> => {
      // @ts-expect-error - createServerFn types don't properly reflect GET data parameter
      return await getPlanCodes({ data: { planId } })
    },
  })

export const issuePlanCodeOptions = {
  mutationKey: ['plan', 'codes', 'issue'],
  mutationFn: async (params: IssuePlanCodeParams) => {
    // @ts-expect-error - createServerFn types don't properly reflect POST data parameter
    return await issuePlanCode({ data: params })
  },
}

export const resendPlanCodeOptions = {
  mutationKey: ['plan', 'codes', 'resend'],
  mutationFn: async (params: ResendPlanCodeParams) => {
    // @ts-expect-error - createServerFn types don't properly reflect POST data parameter
    return await resendPlanCode({ data: params })
  },
}

export const setPlanStatusOptions = {
  mutationKey: ['plan', 'status'],
  mutationFn: async (params: SetPlanStatusParams) => {
    // @ts-expect-error - createServerFn types don't properly reflect POST data parameter
    return await setPlanStatus({ data: params })
  },
}

export const markParticipantOptions = {
  mutationKey: ['plan', 'mark-participant'],
  mutationFn: async (params: MarkParticipantParams) => {
    // @ts-expect-error - createServerFn types don't properly reflect POST data parameter
    return await markParticipant({ data: params })
  },
}

export const setPlanScheduleOptions = {
  mutationKey: ['plan', 'schedule'],
  mutationFn: async (params: SetPlanScheduleParams) => {
    // @ts-expect-error - createServerFn types don't properly reflect POST data parameter
    return await setPlanSchedule({ data: params })
  },
}

export const resetCodeAttemptsOptions = {
  mutationKey: ['plan', 'reset-code-attempts'],
  mutationFn: async (params: ResetCodeAttemptsParams) => {
    // @ts-expect-error - createServerFn types don't properly reflect POST data parameter
    return await resetCodeAttempts({ data: params })
  },
}

export const forceJoinOptions = {
  mutationKey: ['plan', 'force-join'],
  mutationFn: async (params: ForceJoinParams) => {
    // @ts-expect-error - createServerFn types don't properly reflect POST data parameter
    return await forceJoin({ data: params })
  },
}
