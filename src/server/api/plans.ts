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

export interface PlanCategory {
  _id: string
  id: number
  name: string
  subDescription: Array<string>
  description: string
  status: 'ACTIVE' | 'DISABLED'
  createdAt: string
  updatedAt: string
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
  category?: PlanCategory
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
  images?: Array<string>
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
  /** Open REPORT_PLAN tickets targeting this plan. */
  reportCount?: number
  /** Populated for slot instances. */
  parentPlan?: { _id: string; title: string }
  /** Heuristic flag: slot instant may be stored as local time in UTC. */
  timezoneMismatch?: boolean
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

export type PlanSortField =
  | 'createdAt'
  | 'updatedAt'
  | 'startDate'
  | 'endDate'
  | 'title'
  | 'status'
  | 'views'

export type PlanKindFilter = 'one-off' | 'recurring' | 'instances'

export type PlanReportFilter = 'has' | 'no'

export interface PlanSearchParams {
  page?: number
  limit?: number
  query?: string
  type?: Array<PlanTypeFilter>
  creator?: string
  status?: Array<PlanStatusFilter>
  planKinds?: Array<PlanKindFilter>
  reports?: Array<PlanReportFilter>
  /** Filter plans whose startDate is on or after this day (YYYY-MM-DD). */
  startDate?: string
  /** Filter plans whose startDate is on or before this day (YYYY-MM-DD). */
  endDate?: string
  categoryId?: number
  /** Filter plans created on or after this day (YYYY-MM-DD). */
  createdFrom?: string
  /** Filter plans created on or before this day (YYYY-MM-DD). */
  createdTo?: string
  /** Hide recurring-slot instances so each plan appears once. */
  excludeInstances?: boolean
  /** Return only slot instances (parentPlanId set). */
  instancesOnly?: boolean
  /** Return only the instances of this recurring template. */
  parentPlanId?: string
  /** When true, only plans with REPORT_PLAN tickets; when false, exclude them. */
  hasReports?: boolean
  /** Plans sharing the same parent + startDate (duplicate slot instances). */
  duplicateSlots?: boolean
  sortBy?: PlanSortField
  sortOrder?: 'asc' | 'desc'
}

export interface PlanCategoriesResponse {
  status: string
  data: {
    categories: Array<PlanCategory>
  }
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

export const getPlanCategories = createServerFn({
  method: 'GET',
}).handler(async () => {
  const result = await apiClient.get<PlanCategoriesResponse>('/plan-categories')
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

// ─── Plan code management (admin) ───────────────────────────────────

export interface PlanCodeMutationResponse {
  success: boolean
  data: any
}

export type PlanCodeType = 'start' | 'end'

export interface PlanCodeEntry {
  entryId: string
  participantId: string | null
  displayName: string | null
  participantStatus: string | null
  startCode: string | null
  startCodeGeneratedAt: string | null
  startCodeEnteredAt: string | null
  startCodeAttempts: number
  endCode: string | null
  endCodeGeneratedAt: string | null
  endCodeEnteredAt: string | null
  endCodeAttempts: number
}

export interface PlanCodesData {
  planId: string
  title: string | null
  type: string | null
  status: string | null
  isRecurring: boolean
  parentPlanId: string | null
  startDate: string | null
  endDate: string | null
  timezone: string | null
  minsToStart: number | null
  minsToEnd: number | null
  entries: Array<PlanCodeEntry>
}

export interface PlanCodesResponse {
  success: boolean
  data: PlanCodesData
}

export const getPlanCodes = createServerFn({ method: 'GET' }).handler(
  async (ctx) => {
    const { planId } = (ctx.data ?? {}) as { planId?: string }
    if (!planId) throw new Error('Plan ID is required')
    return await apiClient.get<PlanCodesResponse>(
      `/admin/plans/${planId}/codes`,
    )
  },
)

export interface IssuePlanCodeParams {
  planId: string
  type: PlanCodeType
  participantId?: string
  code?: string
  regenerate?: boolean
  dryRun?: boolean
  reason?: string
}

export const issuePlanCode = createServerFn({ method: 'POST' }).handler(
  async (ctx) => {
    const p = ctx.data as IssuePlanCodeParams | undefined
    if (!p?.planId) throw new Error('Plan ID is required')
    return await apiClient.post<PlanCodeMutationResponse>(`/admin/plans/${p.planId}/codes/issue`, {
      type: p.type,
      participantId: p.participantId,
      code: p.code,
      regenerate: p.regenerate,
      dryRun: p.dryRun,
      reason: p.reason,
    })
  },
)

export interface ResendPlanCodeParams {
  planId: string
  type: PlanCodeType
  participantId: string
  dryRun?: boolean
  reason?: string
}

export const resendPlanCode = createServerFn({ method: 'POST' }).handler(
  async (ctx) => {
    const p = ctx.data as ResendPlanCodeParams | undefined
    if (!p?.planId) throw new Error('Plan ID is required')
    return await apiClient.post<PlanCodeMutationResponse>(`/admin/plans/${p.planId}/codes/resend`, {
      type: p.type,
      participantId: p.participantId,
      dryRun: p.dryRun,
      reason: p.reason,
    })
  },
)

export interface SetPlanStatusParams {
  planId: string
  status: 'Active' | 'In Progress' | 'Completed' | 'Cancelled'
}

export const setPlanStatus = createServerFn({ method: 'POST' }).handler(
  async (ctx) => {
    const p = ctx.data as SetPlanStatusParams | undefined
    if (!p?.planId) throw new Error('Plan ID is required')
    return await apiClient.post<PlanCodeMutationResponse>(`/admin/plans/${p.planId}/status`, {
      status: p.status,
    })
  },
)

export interface MarkParticipantParams {
  planId: string
  participantId: string
  stage: 'present' | 'completed'
  dryRun?: boolean
  reason?: string
}

export const markParticipant = createServerFn({ method: 'POST' }).handler(
  async (ctx) => {
    const p = ctx.data as MarkParticipantParams | undefined
    if (!p?.planId || !p.participantId) {
      throw new Error('Plan ID and participant ID are required')
    }
    return await apiClient.post<PlanCodeMutationResponse>(`/admin/plans/${p.planId}/participants/${p.participantId}/mark`,
      { stage: p.stage, dryRun: p.dryRun, reason: p.reason },
    )
  },
)

export interface ResetCodeAttemptsParams {
  planId: string
  participantId: string
  start?: boolean
  end?: boolean
  clearCode?: boolean
  dryRun?: boolean
  reason?: string
}

export const resetCodeAttempts = createServerFn({ method: 'POST' }).handler(
  async (ctx) => {
    const p = ctx.data as ResetCodeAttemptsParams | undefined
    if (!p?.planId || !p.participantId) {
      throw new Error('Plan ID and participant ID are required')
    }
    return await apiClient.post<PlanCodeMutationResponse>(
      `/admin/plans/${p.planId}/participants/${p.participantId}/reset-code-attempts`,
      {
        start: p.start,
        end: p.end,
        clearCode: p.clearCode,
        dryRun: p.dryRun,
        reason: p.reason,
      },
    )
  },
)

export interface ForceJoinParams {
  planId: string
  participantId: string
  transactionId?: string
  dryRun?: boolean
  reason?: string
}

export const forceJoin = createServerFn({ method: 'POST' }).handler(
  async (ctx) => {
    const p = ctx.data as ForceJoinParams | undefined
    if (!p?.planId || !p.participantId) {
      throw new Error('Plan ID and participant ID are required')
    }
    return await apiClient.post<PlanCodeMutationResponse>(
      `/admin/plans/${p.planId}/participants/${p.participantId}/force-join`,
      {
        transactionId: p.transactionId,
        dryRun: p.dryRun,
        reason: p.reason,
      },
    )
  },
)

export interface SetPlanScheduleParams {
  planId: string
  startDate?: string
  endDate?: string
  timezone?: string
}

export const setPlanSchedule = createServerFn({ method: 'POST' }).handler(
  async (ctx) => {
    const p = ctx.data as SetPlanScheduleParams | undefined
    if (!p?.planId) throw new Error('Plan ID is required')
    return await apiClient.post<PlanCodeMutationResponse>(`/admin/plans/${p.planId}/schedule`, {
      startDate: p.startDate,
      endDate: p.endDate,
      timezone: p.timezone,
    })
  },
)
