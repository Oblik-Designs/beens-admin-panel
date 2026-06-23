import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'

import { Entity360Shell } from '@/components/admin/entity-360-shell'
import { RemediationPanel } from '@/components/admin/remediation-panel'
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
 * Header shows the plan title + creator + current status. Timeline +
 * Remediation still come from Phase 3 placeholders.
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

    const actorRole = 'MANAGER' as const

    return (
        <Entity360Shell
            title={title ?? 'Plan'}
            subtitle={planId}
            summary={
                <PlanSummaryCard plan={plan} planId={planId} isLoading={planLoading} />
            }
            timeline={
                timelineLoading ? (
                    <div className="h-32 animate-pulse rounded-lg border bg-muted/40" />
                ) : (
                    <Timeline events={timelineEvents} />
                )
            }
            sidebar={
                remediationContext ? (
                    <RemediationPanel
                        context={remediationContext}
                        actorRole={actorRole}
                        onPreview={previewRemediationAction}
                        onApply={async (action, reason) => {
                            const res = await applyRemediationAction(action, reason)
                            return { auditEntryId: res.auditEntryId }
                        }}
                    />
                ) : (
                    <div className="h-32 animate-pulse rounded-lg border bg-muted/40" />
                )
            }
        />
    )
}

interface PlanSummaryCardProps {
    plan: Record<string, any>
    planId: string
    isLoading: boolean
}

function PlanSummaryCard({ plan, planId, isLoading }: PlanSummaryCardProps) {
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
                    <div className="w-64 shrink-0 space-y-1.5">
                        <Skeleton className="h-3 w-16" />
                        <div className="flex items-start gap-3">
                            <Skeleton className="size-10 rounded-full" />
                            <div className="flex-1 space-y-1.5">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-40" />
                            </div>
                        </div>
                    </div>
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="w-32 shrink-0 space-y-1.5">
                            <Skeleton className="h-3 w-14" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    ))}
                    <div className="flex shrink-0 items-start gap-4">
                        {Array.from({ length: 2 }).map((_, i) => (
                            <div key={i} className="w-24 shrink-0 space-y-1.5">
                                <Skeleton className="h-3 w-12" />
                                <Skeleton className="h-4 w-20" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    const title = (plan.title as string | undefined) ?? 'Untitled plan'
    const creator = (plan.creator ?? {}) as Record<string, any>
    const creatorNameRaw =
        (creator.displayName as string | undefined) ??
        `${creator.firstName ?? ''} ${creator.lastName ?? ''}`.trim()
    const creatorName =
        creatorNameRaw && creatorNameRaw.length > 0 ? creatorNameRaw : null
    const creatorImage = (creator.profileImage as string | undefined) ?? undefined
    const status = (plan.status as string | undefined) ?? null
    const type = (plan.type as string | undefined) ?? null
    const startDate = (plan.startDate as string | undefined) ?? null
    const endDate = (plan.endDate as string | undefined) ?? null
    const budget = plan.budget as { amount?: number; currency?: string } | undefined
    const primaryImage = (plan.primaryImage as string | undefined) ?? undefined

    const creatorId =
        (creator._id as string | undefined) ??
        (creator.id as string | undefined) ??
        null

    return (
        <div className="rounded-lg border bg-muted/40 px-4 py-3">
            <div className="flex flex-wrap items-start gap-6">
                {/* Plan identity column — fixed width to match User 360 */}
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

                {/* Hosted by — sibling identity column, mirrors the Plan box */}
                <div className="w-64 shrink-0 space-y-1.5">
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
                                <div className="truncate text-sm font-semibold">
                                    {creatorName}
                                </div>
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

                <StatColumn label="Status" value={status?.toLowerCase()} />
                <StatColumn label="Type" value={type?.toLowerCase()} />
                <StatColumn
                    label="Budget"
                    value={
                        budget?.amount !== undefined
                            ? `${budget.currency ?? 'THB'} ${budget.amount}`
                            : undefined
                    }
                    mono
                />

                {/* Starts + Ends share one container so wrap behaviour keeps
                    them on the same row. Each cell is narrower (w-24) since
                    "Jun 30, 2026" only needs ~12ch. */}
                <div className="flex shrink-0 items-start gap-4">
                    <StatColumn
                        label="Starts"
                        value={
                            startDate
                                ? format(new Date(startDate), 'PP')
                                : undefined
                        }
                        width="w-24"
                    />
                    <StatColumn
                        label="Ends"
                        value={
                            endDate ? format(new Date(endDate), 'PP') : undefined
                        }
                        width="w-24"
                    />
                </div>
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
                className={`truncate ${
                    mono
                        ? 'font-mono text-sm font-medium tabular-nums'
                        : 'text-sm font-medium'
                }`}
            >
                {value && value.length > 0 ? value : '-'}
            </div>
        </div>
    )
}
