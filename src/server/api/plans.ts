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
  subDescription: string[]
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
  categoryId?: number
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
