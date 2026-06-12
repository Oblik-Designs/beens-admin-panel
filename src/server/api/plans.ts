import { createServerFn } from '@tanstack/react-start'
import { apiClient } from '../client'

export interface PlanCreator {
  _id: string
  firstName: string
  lastName: string
  displayName: string
  profileImage: string
  perceivedAs: string
}

export interface PlanLocationCoordinates {
  type: 'Point'
  coordinates: [number, number]
}

export interface PlanLocation {
  address: string
  coordinates: PlanLocationCoordinates
  city: string
  state: string
  country: string
  zipCode: string
}

export interface PlanBudget {
  amount: number
  currency: string
}

export interface Plan {
  _id: string
  title: string
  description: string
  type: string
  privacy: string
  creator: PlanCreator
  cohosts: Array<any>
  status: string
  location: PlanLocation
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  duration: number
  maxParticipants: number
  currentParticipants: Array<string>
  budget: PlanBudget
  primaryImage: string
  tags: Array<string>
  views: number
  createdAt: string
  isFull: boolean
  canJoin: boolean
  /** True for recurring plan templates. */
  isRecurring?: boolean
  /** Set on slot instances spawned from a recurring template. */
  parentPlanId?: string | null
  /** Rollups the API attaches to recurring templates (non-cancelled children). */
  instancesCount?: number
  instanceParticipantsTotal?: number
}

export interface PlanSearchPagination {
  page: number
  limit: number
  totalItems: number
  totalPages: number
}

export type PlanTypeFilter = 'Pay to Join' | 'Join to Earn' | 'Bid to Join'

export type PlanStatusFilter =
  | 'Draft'
  | 'Active'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled'
  | 'Suspended'

export interface PlanSearchParams {
  page?: number
  limit?: number
  query?: string
  type?: PlanTypeFilter
  creator?: string
  status?: PlanStatusFilter
  startDate?: string
  endDate?: string
  /** Hide recurring-slot instances so each plan appears once. */
  excludeInstances?: boolean
  /** Return only the instances of this recurring template. */
  parentPlanId?: string
}

export interface PlanSearchResponse {
  success: boolean
  data: {
    plans: Array<Plan>
    pagination: PlanSearchPagination
  }
}

export interface PlanDeleteResponse {
  success: boolean
  data: Plan
}

export interface PlanByIdResponse {
  success: boolean
  data: any
}

export const searchPlans = createServerFn({
  method: 'POST',
}).handler(async (ctx) => {
  const data = ctx.data as PlanSearchParams | undefined
  const result = await apiClient.post<PlanSearchResponse>('/admin/plans', data)
  return result
})

export const getPlanById = createServerFn({
  method: 'GET',
}).handler(async (ctx) => {
  const { planId } = (ctx.data ?? {}) as { planId?: string }
  if (!planId) {
    throw new Error('Plan ID is required')
  }
  const result = await apiClient.get<PlanByIdResponse>(`/plans/${planId}`)
  return result
})

export interface SuspendAndRefundPlanParams {
  planId: string
  reason: string
}

export interface SuspendAndRefundPlanResponse {
  success: boolean
  data: {
    planId: string
    status: string
    reason: string
    refundedTransactionIds: Array<string>
  }
}

export const suspendAndRefundPlan = createServerFn({
  method: 'POST',
}).handler(async (ctx) => {
  const params = ctx.data as SuspendAndRefundPlanParams | undefined
  if (!params?.planId) {
    throw new Error('Plan ID is required')
  }
  if (!params.reason || params.reason.trim().length === 0) {
    throw new Error('Reason is required')
  }
  const result = await apiClient.post<SuspendAndRefundPlanResponse>(
    `/admin/plans/${params.planId}/suspend-and-refund`,
    { reason: params.reason },
  )
  return result
})
