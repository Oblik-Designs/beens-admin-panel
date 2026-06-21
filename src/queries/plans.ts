import { queryOptions } from '@tanstack/react-query'
import type {
  IssuePlanCodeParams,
  MarkParticipantParams,
  PlanCodesResponse,
  PlanSearchParams,
  ResendPlanCodeParams,
  SetPlanScheduleParams,
  SetPlanStatusParams,
  SuspendAndRefundPlanResponse,
} from '@/server/api/plans'
import {
  getPlanById,
  getPlanCategories,
  getPlanCodes,
  issuePlanCode,
  markParticipant,
  resendPlanCode,
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
