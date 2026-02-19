import { createServerFn } from '@tanstack/react-start'
import { apiClient } from '../client'
import { useAppSession } from '../session'

export interface TicketUserSummary {
  _id: string
  firstName: string
  lastName: string
  displayName: string
  profileImage: string
}

export interface Ticket {
  _id: string
  reporter: TicketUserSummary
  assignedTo: TicketUserSummary
  type: string
  status: string
  priority: string
  title: string
  description: string
  closedAt?: string
  createdAt: string
  updatedAt: string
}

export interface TicketReportedTargetUser {
  _id: string
  firstName: string
  lastName: string
  displayName: string
}

export interface TicketReportedTarget {
  targetId: TicketReportedTargetUser
  targetModel: string
  reason: string
  evidence: string[]
  status: string
  description: string
}

export interface TicketStatusHistoryEntry {
  status: string
  changedBy: TicketUserSummary
  changedAt: string
  note?: string
}

export interface TicketDetail extends Ticket {
  attachments: {}[]
  reportedTargets: TicketReportedTarget[]
  messages: {}[]
  assignmentHistory: {}[]
  statusHistory: TicketStatusHistoryEntry[]
}

export interface TicketDetailResponse {
  success: boolean
  data: TicketDetail
}

export interface TicketCloseParams {
  ticketId: string
  note: string
}

export interface TicketCloseResponse {
  success: boolean
  data: TicketDetail
}

export interface TicketPlanResolveParams {
  ticketId: string
  action: string
  escalationReason?: string
  description?: string
  refundAmount?: number
}

export interface TicketResolution {
  action: string
  description: string
  resolvedBy: TicketUserSummary
  resolvedAt: string
  affectedUsers?: string[]
}

export interface TicketPlanResolveData extends Ticket {
  resolution?: TicketResolution
}

export interface TicketPlanResolveResponse {
  success: boolean
  data: TicketPlanResolveData
}

export interface TicketSearchPagination {
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
  totalTickets: number
}

export interface TicketSearchParams {
  reporter?: string
  assignedTo?: string
  query?: string
  type?: string
  status?: string
  priority?: string
  reason?: string
  resolutionAction?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface TicketSearchResponse {
  success: boolean
  data: {
    tickets: Ticket[]
    pagination: TicketSearchPagination
  }
}

export const searchTickets = createServerFn({
  method: 'POST',
}).handler(async (ctx) => {
  const data = ctx.data as TicketSearchParams | undefined
  const session = await useAppSession()
  const currentUserId = session.data?.user?._id
  const params: TicketSearchParams = {
    ...data,
    ...(currentUserId && { assignedTo: currentUserId }),
  }
  const result = await apiClient.post<TicketSearchResponse>(
    '/tickets/search',
    params,
  )
  return result
})

export const getTicketById = createServerFn({
  method: 'POST',
}).handler(async (ctx) => {
  const ticketId = ctx.data as string | undefined
  if (!ticketId) {
    throw new Error('Ticket ID is required')
  }
  const result = await apiClient.get<TicketDetailResponse>(
    `/tickets/${ticketId}`,
  )
  return result
})

export const closeTicket = createServerFn({
  method: 'POST',
}).handler(async (ctx) => {
  const data = ctx.data as TicketCloseParams | undefined
  if (!data?.ticketId) {
    throw new Error('ticketId is required')
  }
  const result = await apiClient.post<TicketCloseResponse>(
    '/tickets/close',
    data,
  )
  return result
})

export const resolvePlanReportTicket = createServerFn({
  method: 'POST',
}).handler(async (ctx) => {
  const data = ctx.data as TicketPlanResolveParams | undefined
  if (!data?.ticketId) {
    throw new Error('ticketId is required')
  }
  const result = await apiClient.post<TicketPlanResolveResponse>(
    '/tickets/plan/resolve',
    data,
  )
  return result
})
