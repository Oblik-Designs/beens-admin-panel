import type { Plan } from '@/server/api/plans'
import { format, parseISO } from 'date-fns'

export function formatPlanDateTime(value?: string) {
  if (!value) return null

  let date: Date

  try {
    date = parseISO(value)
    if (Number.isNaN(date.getTime())) {
      throw new Error('Invalid ISO date')
    }
  } catch {
    const fallback = new Date(value)
    if (Number.isNaN(fallback.getTime())) return value
    date = fallback
  }

  return format(date, 'MMM d, yyyy · h:mm a')
}

export function combinePlanDateAndTime(date?: string, time?: string) {
  if (!date) return undefined
  if (!time) return date
  if (date.includes('T')) return date
  return `${date}T${time}`
}

export function formatPlanBudget(amount?: number, currency?: string) {
  if (amount == null || Number.isNaN(amount)) return null
  const code = currency?.toUpperCase() || 'THB'
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${amount.toLocaleString()} ${code}`
  }
}

export function planCreatorName(creator?: {
  displayName?: string
  firstName?: string
  lastName?: string
}) {
  if (!creator) return 'Unknown host'
  return (
    creator.displayName?.trim() ||
    `${creator.firstName ?? ''} ${creator.lastName ?? ''}`.trim() ||
    'Unknown host'
  )
}

export function planParticipantCount(plan: {
  isRecurring?: boolean
  instanceParticipantsTotal?: number
  currentParticipants?: Array<unknown>
  maxParticipants?: number
}) {
  const count = plan.isRecurring
    ? (plan.instanceParticipantsTotal ?? plan.currentParticipants?.length ?? 0)
    : (plan.currentParticipants?.length ?? 0)
  const max = plan.maxParticipants
  if (max != null && max > 0) return `${count}/${max}`
  return String(count)
}

export function planCardImageUrl(plan: Plan) {
  return plan.primaryImage?.trim() || plan.images?.[0]?.trim() || null
}

/** All image URLs on a plan card — for session bitmap pre-decode. */
export function planCardImageUrls(plan: Plan) {
  const urls: Array<string> = []
  const primary = plan.primaryImage?.trim()
  if (primary) urls.push(primary)
  for (const image of plan.images ?? []) {
    const trimmed = image?.trim()
    if (trimmed && !urls.includes(trimmed)) urls.push(trimmed)
  }
  const hostImage = plan.creator?.profileImage?.trim()
  if (hostImage && !urls.includes(hostImage)) urls.push(hostImage)
  return urls
}
