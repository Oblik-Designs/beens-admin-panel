import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { CalendarIcon, UserIcon } from 'lucide-react'
import { format, parseISO } from 'date-fns'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PlanCodesSheet } from '@/components/plan-codes-sheet'
import { searchPlansOptions } from '@/queries/plans'

/**
 * Participants section for the Plan 360 sidebar. Ports every feature
 * from the old DetailSheet participants block:
 *
 *   - Current participant avatars + names, linking to each user's 360.
 *   - Manage codes button (opens existing PlanCodesSheet).
 *   - Slot-instance list for recurring templates, with per-slot
 *     navigation and a Suspended badge when applicable.
 *
 * The actual slot-suspend mutation now lives on each slot's own Plan
 * 360 page (via the RemediationPanel `footerSlot`) — clicking a slot
 * row navigates there.
 */
export interface PlanParticipantsCardProps {
    plan: Record<string, any>
}

const formatSlotDate = (value?: string) => {
    if (!value) return '-'
    try {
        const d = parseISO(value)
        if (Number.isNaN(d.getTime())) return value
        return format(d, 'MMM dd, yyyy')
    } catch {
        return value
    }
}

export function PlanParticipantsCard({ plan }: PlanParticipantsCardProps) {
    const navigate = useNavigate()
    const [codesOpen, setCodesOpen] = React.useState(false)

    const isRecurring = !!plan.isRecurring
    const planId = plan._id as string | undefined
    const creatorId = (plan.creator?._id ?? plan.creator?.id) as
        | string
        | undefined

    const { data: instancesResponse, isLoading: isInstancesLoading } = useQuery({
        ...searchPlansOptions({
            parentPlanId: planId ?? undefined,
            creator: creatorId,
            limit: 100,
        }),
        enabled: !!planId && !!isRecurring && !!creatorId,
    })

    const instances = React.useMemo(
        () =>
            ((instancesResponse?.data?.plans as Array<any>) ?? []).filter(
                (p) => p.parentPlanId === planId,
            ),
        [instancesResponse, planId],
    )

    const participants = (plan.currentParticipants ?? []) as Array<any>
    const participantCount = participants.length
    const maxParticipants = plan.maxParticipants as number | undefined

    return (
        <>
            <div className="space-y-3 rounded-lg border bg-muted/40 px-4 py-3">
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                    <span>Participants</span>
                    <span>
                        {participantCount}
                        {maxParticipants ? ` / ${maxParticipants}` : ''}
                    </span>
                </div>

                {planId && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => setCodesOpen(true)}
                    >
                        Manage codes
                    </Button>
                )}

                {participantCount === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No participants yet.
                    </p>
                ) : (
                    <div className="space-y-1">
                        {participants.map((participant) => {
                            const id =
                                typeof participant === 'string'
                                    ? participant
                                    : participant?._id
                            const name =
                                typeof participant === 'string'
                                    ? participant
                                    : participant?.displayName ||
                                      `${participant?.firstName ?? ''} ${
                                          participant?.lastName ?? ''
                                      }`.trim() ||
                                      'Unknown user'
                            const profileImage =
                                typeof participant === 'string'
                                    ? undefined
                                    : participant?.profileImage
                            if (!id) return null
                            return (
                                <Link
                                    key={id}
                                    to="/users/$userId"
                                    params={{ userId: id }}
                                    className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left text-sm hover:bg-muted/70 transition-colors"
                                >
                                    <Avatar className="size-7">
                                        <AvatarImage src={profileImage} alt={name} />
                                        <AvatarFallback className="text-muted-foreground bg-transparent border">
                                            <UserIcon className="size-3.25" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="truncate font-medium">
                                        {name}
                                    </span>
                                </Link>
                            )
                        })}
                    </div>
                )}
            </div>

            {isRecurring && (
                <div className="space-y-2 rounded-lg border bg-muted/40 px-4 py-3">
                    <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                        <span>Slot instances</span>
                        <span>{instances.length}</span>
                    </div>
                    {isInstancesLoading && (
                        <p className="text-sm text-muted-foreground">
                            Loading instances...
                        </p>
                    )}
                    {!isInstancesLoading && instances.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            No booked slots yet.
                        </p>
                    )}
                    <div className="space-y-1">
                        {instances.map((instance) => {
                            const instanceParticipants =
                                instance.currentParticipants?.length ?? 0
                            const isInstanceSuspended =
                                instance.status === 'Suspended'
                            return (
                                <div
                                    key={instance._id}
                                    className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-1.5 text-left text-sm hover:bg-muted/70 transition-colors"
                                >
                                    <button
                                        type="button"
                                        onClick={() =>
                                            navigate({
                                                to: '/plans/$planId',
                                                params: {
                                                    planId: instance._id,
                                                },
                                            })
                                        }
                                        className="flex flex-1 items-center gap-2 text-left cursor-pointer min-w-0"
                                    >
                                        <CalendarIcon className="size-3 shrink-0 text-muted-foreground" />
                                        <span className="truncate font-medium">
                                            {formatSlotDate(instance.startDate)}
                                            {instance.startTime
                                                ? ` at ${instance.startTime}`
                                                : ''}
                                        </span>
                                        <span className="shrink-0 text-xs text-muted-foreground">
                                            {instanceParticipants} participant
                                            {instanceParticipants === 1
                                                ? ''
                                                : 's'}
                                        </span>
                                    </button>
                                    {isInstanceSuspended && (
                                        <Badge
                                            variant="outline"
                                            className="h-6 px-2 text-[10px] font-medium text-destructive border-destructive/30 bg-destructive/5"
                                        >
                                            Suspended
                                        </Badge>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            <PlanCodesSheet
                open={codesOpen}
                onOpenChange={setCodesOpen}
                planId={planId ?? null}
            />
        </>
    )
}
