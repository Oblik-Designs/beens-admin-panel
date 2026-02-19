import { mutationOptions, queryOptions } from '@tanstack/react-query'
import {
  closeTicket,
  getTicketById,
  resolvePlanReportTicket,
  resolveUserReportTicket,
  searchTickets,
  type TicketCloseParams,
  type TicketPlanResolveParams,
  type TicketSearchParams,
  type TicketUserResolveParams,
} from '@/server/api/tickets'

export const searchTicketsOptions = (params?: TicketSearchParams) =>
  queryOptions({
    queryKey: ['tickets', 'search', params],
    queryFn: async () => {
      // @ts-expect-error - createServerFn types don't properly reflect POST data parameter
      return await searchTickets({ data: params })
    },
  })

export const ticketDetailOptions = (ticketId: string) =>
  queryOptions({
    queryKey: ['tickets', 'detail', ticketId],
    queryFn: async () => {
      // @ts-expect-error - createServerFn types don't properly reflect POST data parameter
      return await getTicketById({ data: { ticketId } })
    },
    enabled: !!ticketId,
  })

export const closeTicketOptions = mutationOptions({
  mutationKey: ['tickets', 'close'],
  mutationFn: async (params: TicketCloseParams) => {
    // @ts-expect-error - createServerFn types don't properly reflect POST data parameter
    return await closeTicket({ data: params })
  },
})

export const resolvePlanReportTicketOptions = mutationOptions({
  mutationKey: ['tickets', 'plan', 'resolve'],
  mutationFn: async (params: TicketPlanResolveParams) => {
    // @ts-expect-error - createServerFn types don't properly reflect POST data parameter
    return await resolvePlanReportTicket({ data: params })
  },
})

export const resolveUserReportTicketOptions = mutationOptions({
  mutationKey: ['tickets', 'user', 'resolve'],
  mutationFn: async (params: TicketUserResolveParams) => {
    // @ts-expect-error - createServerFn types don't properly reflect POST data parameter
    return await resolveUserReportTicket({ data: params })
  },
})
