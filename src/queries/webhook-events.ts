import { queryOptions } from '@tanstack/react-query'

import type {WebhookEventsSearchParams} from '@/server/api/crisis';
import {
    
    getWebhookEventPayload,
    searchWebhookEvents
} from '@/server/api/crisis'

export const searchWebhookEventsOptions = (params: WebhookEventsSearchParams) =>
    queryOptions({
        queryKey: ['webhook-events', 'search', params],
        queryFn: async () => {
            // @ts-expect-error - createServerFn types don't reflect the data param
            return await searchWebhookEvents({ data: params })
        },
    })

export const webhookEventPayloadOptions = (eventId: string | null) =>
    queryOptions({
        queryKey: ['webhook-events', 'payload', eventId],
        queryFn: async () => {
            if (!eventId) throw new Error('eventId is required')
            // @ts-expect-error - createServerFn types don't reflect the data param
            return await getWebhookEventPayload({ data: eventId })
        },
        enabled: !!eventId,
        // Raw payloads are immutable once stored — no need to refetch.
        staleTime: Infinity,
    })
