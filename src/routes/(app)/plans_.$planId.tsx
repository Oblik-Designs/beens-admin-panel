import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'

import { Entity360Shell } from '@/components/admin/entity-360-shell'
import { PlanParticipantsCard } from '@/components/admin/plan-participants-card'
import { PlanSummaryCard } from '@/components/admin/plan-summary-card'
import { RemediationPanel } from '@/components/admin/remediation-panel'
import { SuspendPlanButton } from '@/components/admin/suspend-plan-button'
import { Timeline } from '@/components/admin/timeline'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
    applyRemediationAction,
    planTimelineOptions,
    previewRemediationAction,
    remediationContextOptions,
} from '@/queries/crisis'
import { getPlanByIdOptions } from '@/queries/plans'

/**
 * Plan 360 — Phase 3 / L1 of the Crisis Console.
 *
 * Top header carries the plan identity plus its "who / where / when"
 * columns: Hosted by, Location, Start Schedule, End Schedule, Date
 * Created.
 *
 * Sidebar stacks:
 *   1. Plan summary — Category / Type / Status / Budget (2×2 grid)
 *   2. Participants — avatars + manage codes + slot instances
 *   3. Remediation panel (Xendit / Sumsub actions + Suspend at the bottom)
 */

export const Route = createFileRoute('/(app)/plans_/$planId')({
    component: PlanDetailPage,
})

function PlanDetailPage() {
    const { planId } = Route.useParams()

    const { data: planRes, isLoading: planLoading } = useQuery(
        getPlanByIdOptions(planId),
    )
    const { data: timelineRes, isLoading: timelineLoading } = useQuery(
        planTimelineOptions(planId),
    )
    const { data: remediationRes } = useQuery(
        remediationContextOptions('Plan', planId),
    )

    const plan = (planRes?.data ?? {}) as Record<string, any>
    const title = (plan.title as string | undefined) ?? null
    const timelineEvents = timelineRes?.data ?? []
    const remediationContext = remediationRes?.data
    const planReady = !planLoading && !!plan._id

    const actorRole = 'MANAGER' as const

    return (
        <Entity360Shell
            title={title ?? 'Plan'}
            subtitle={planId}
            summary={
                <PlanHeaderCard plan={plan} planId={planId} isLoading={planLoading} />
            }
            timeline={
                timelineLoading ? (
                    <div className="h-full animate-pulse rounded-lg border bg-muted/40" />
                ) : (
                    <Timeline events={timelineEvents} />
                )
            }
            sidebar={
                <>
                    {planReady ? (
                        <>
                            <PlanSummaryCard plan={plan} />
                            <PlanParticipantsCard plan={plan} />
                        </>
                    ) : (
                        <div className="h-48 animate-pulse rounded-lg border bg-muted/40" />
                    )}
                    {remediationContext ? (
                        <RemediationPanel
                            context={remediationContext}
                            actorRole={actorRole}
                            onPreview={previewRemediationAction}
                            onApply={async (action, reason) => {
                                const res = await applyRemediationAction(
                                    action,
                                    reason,
                                )
                                return { auditEntryId: res.auditEntryId }
                            }}
                            footerSlot={
                                planReady ? (
                                    <SuspendPlanButton plan={plan} />
                                ) : null
                            }
                        />
                    ) : (
                        <div className="h-32 animate-pulse rounded-lg border bg-muted/40" />
                    )}
                </>
            }
        />
    )
}

interface PlanHeaderCardProps {
    plan: Record<string, any>
    planId: string
    isLoading: boolean
}

const formatDateOrFallback = (value?: string | null) => {
    if (!value) return null
    try {
        const d = parseISO(value)
        if (Number.isNaN(d.getTime())) return value
        return format(d, 'PP')
    } catch {
        return value
    }
}

/**
 * Top header card. Plan identity + Hosted by + Location + Start
 * Schedule + End Schedule + Date Created.
 */
function PlanHeaderCard({ plan, planId, isLoading }: PlanHeaderCardProps) {
    if (isLoading) {
        return (
            <div className="rounded-lg border bg-muted/40 px-4 py-3">
                <div className="flex flex-wrap items-start gap-6">
                    <div className="w-80 shrink-0 space-y-1.5">
                        <Skeleton className="h-3 w-12" />
                        <div className="flex items-start gap-3">
                            <Skeleton className="size-10 rounded-md" />
                            <div className="flex-1 space-y-1.5">
                                <Skeleton className="h-4 w-56" />
                                <Skeleton className="h-3 w-40" />
                            </div>
                        </div>
                    </div>
                    <div className="w-56 shrink-0 space-y-1.5">
                        <Skeleton className="h-3 w-16" />
                        <div className="flex items-start gap-3">
                            <Skeleton className="size-10 rounded-full" />
                            <div className="flex-1 space-y-1.5">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-40" />
                            </div>
                        </div>
                    </div>
                    <div className="w-56 shrink-0 space-y-1.5">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-4 w-44" />
                    </div>
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="w-32 shrink-0 space-y-1.5">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    const title = (plan.title as string | undefined) ?? 'Untitled plan'
    const primaryImage = (plan.primaryImage as string | undefined) ?? undefined

    // Hosted by
    const creator = (plan.creator ?? {}) as Record<string, any>
    const creatorNameRaw =
        (creator.displayName as string | undefined) ??
        `${creator.firstName ?? ''} ${creator.lastName ?? ''}`.trim()
    const creatorName =
        creatorNameRaw && creatorNameRaw.length > 0 ? creatorNameRaw : null
    const creatorImage = (creator.profileImage as string | undefined) ?? undefined
    const creatorId =
        (creator._id as string | undefined) ??
        (creator.id as string | undefined) ??
        null

    // Location
    const location = plan.location ?? {}
    const fullLocation =
        [
            location.address,
            location.city,
            location.state,
            location.country,
            location.zipCode,
        ]
            .filter(Boolean)
            .join(', ') || null

    // Schedule
    const startDate = formatDateOrFallback(
        plan.startDate as string | null | undefined,
    )
    const endDate = formatDateOrFallback(
        plan.endDate as string | null | undefined,
    )
    const startTime = plan.startTime as string | undefined
    const endTime = plan.endTime as string | undefined
    const createdAt = formatDateOrFallback(
        plan.createdAt as string | null | undefined,
    )

    return (
        <div className="rounded-lg border bg-muted/40 px-4 py-3">
            <div className="flex flex-wrap items-start gap-6">
                {/* Plan identity column */}
                <div className="w-80 shrink-0 space-y-1.5">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        Plan
                    </div>
                    <div className="flex items-start gap-3">
                        <Avatar className="size-10 shrink-0 rounded-md">
                            <AvatarImage src={primaryImage} alt={title} />
                            <AvatarFallback className="rounded-md">P</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="truncate text-sm font-semibold">
                                {title}
                            </div>
                            <code className="block truncate text-[11px] text-muted-foreground">
                                {planId}
                            </code>
                        </div>
                    </div>
                </div>

                {/* Hosted by — avatar + name linking to user 360 */}
                <div className="w-56 shrink-0 space-y-1.5">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        Hosted by
                    </div>
                    {creatorName ? (
                        <div className="flex items-start gap-3">
                            <Avatar className="size-10 shrink-0">
                                <AvatarImage src={creatorImage} alt={creatorName} />
                                <AvatarFallback>
                                    {creatorName[0]?.toUpperCase() ?? '?'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1 space-y-0.5">
                                {creatorId ? (
                                    <Link
                                        to="/users/$userId"
                                        params={{ userId: creatorId }}
                                        className="block truncate text-sm font-semibold hover:underline"
                                    >
                                        {creatorName}
                                    </Link>
                                ) : (
                                    <div className="truncate text-sm font-semibold">
                                        {creatorName}
                                    </div>
                                )}
                                {creatorId && (
                                    <code className="block truncate text-[11px] text-muted-foreground">
                                        {creatorId}
                                    </code>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground">-</div>
                    )}
                </div>

                {/* Location — capped at 3 lines so the header row keeps a
                    stable height; overflow scrolls inside this cell only. */}
                <div className="w-56 shrink-0 space-y-1">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        Location
                    </div>
                    <div
                        className="max-h-[3.75rem] overflow-y-auto pr-1 text-sm font-medium leading-snug"
                        title={fullLocation ?? undefined}
                    >
                        {fullLocation ?? '-'}
                    </div>
                </div>

                <StatColumn
                    label="Start Schedule"
                    value={
                        startDate
                            ? `${startDate}${startTime ? ` at ${startTime}` : ''}`
                            : null
                    }
                />
                <StatColumn
                    label="End Schedule"
                    value={
                        endDate
                            ? `${endDate}${endTime ? ` at ${endTime}` : ''}`
                            : null
                    }
                />
                <StatColumn label="Date Created" value={createdAt} />
            </div>
        </div>
    )
}

interface StatColumnProps {
    label: string
    value: string | null | undefined
    mono?: boolean
    /** Tailwind width class — default `w-32`. */
    width?: string
}

function StatColumn({ label, value, mono, width = 'w-32' }: StatColumnProps) {
    return (
        <div className={`${width} shrink-0 space-y-1`}>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {label}
            </div>
            <div
                className={
                    mono
                        ? 'truncate font-mono text-sm font-medium tabular-nums'
                        : 'text-sm font-medium leading-snug'
                }
            >
                {value && value.length > 0 ? value : '-'}
            </div>
        </div>
    )
}
