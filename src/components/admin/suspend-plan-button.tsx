import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'

import { suspendAndRefundPlanOptions } from '@/queries/plans'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

/**
 * Destructive "Suspend plan" action — rendered as the RemediationPanel
 * footerSlot on the Plan 360 page so it sits alongside the Xendit /
 * Sumsub remediation actions.
 *
 * Layout matches the UserAdminCard "Save changes" button (full-width,
 * size sm) — solid red background with white text to distinguish it as
 * destructive. The confirm dialog wraps the existing
 * suspendAndRefundPlan flow.
 */
export interface SuspendPlanButtonProps {
    plan: Record<string, any>
}

export function SuspendPlanButton({ plan }: SuspendPlanButtonProps) {
    const queryClient = useQueryClient()
    const navigate = useNavigate()

    const planId = (plan._id as string) ?? ''
    const planTitle = (plan.title as string | undefined) ?? planId
    const isSlot = !!plan.parentPlanId
    const isRecurringTemplate = !!plan.isRecurring

    const [open, setOpen] = React.useState(false)
    const [reason, setReason] = React.useState('')
    const [error, setError] = React.useState<string | null>(null)

    const mutation = useMutation({
        ...suspendAndRefundPlanOptions(planId),
        onSuccess: async () => {
            setError(null)
            await queryClient.invalidateQueries({ queryKey: ['plans'] })
            await queryClient.invalidateQueries({ queryKey: ['plan'] })
            setOpen(false)
            setReason('')
            navigate({ to: '/plans', search: {} as never })
        },
        onError: (err: unknown) => {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Failed to suspend the plan.',
            )
        },
    })

    const dialogTitle = isSlot
        ? 'Suspend this slot & refund?'
        : isRecurringTemplate
          ? 'Suspend whole plan & all slots?'
          : 'Suspend & refund this plan?'

    const dialogDescription = isSlot
        ? `Only this slot${
              plan.startDate
                  ? ` (${plan.startDate}${
                        plan.startTime ? ` ${plan.startTime}` : ''
                    })`
                  : ''
          } will be suspended and its participants will be refunded. Other slots in this recurring plan remain active.`
        : isRecurringTemplate
          ? `"${planTitle}" and every booked slot will be suspended. Each paid slot's participants are refunded; the template itself can be re-published later. This cannot be undone automatically.`
          : `"${planTitle}" will be suspended and all participant payments will be refunded to their wallets. This cannot be undone automatically.`

    const handleConfirm = () => {
        const trimmed = reason.trim()
        if (!trimmed) {
            setError('Please provide a reason for the suspension.')
            return
        }
        setError(null)
        mutation.mutate(trimmed)
    }

    return (
        <>
            <Button
                type="button"
                size="sm"
                className="w-full bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/40"
                onClick={() => {
                    setError(null)
                    setReason('')
                    setOpen(true)
                }}
                disabled={mutation.isPending || !planId}
            >
                {isSlot
                    ? 'Suspend slot'
                    : isRecurringTemplate
                      ? 'Suspend whole plan'
                      : 'Suspend & refund'}
            </Button>

            <AlertDialog
                open={open}
                onOpenChange={(next) => {
                    if (mutation.isPending) return
                    if (!next) {
                        setOpen(false)
                        setReason('')
                        setError(null)
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {dialogDescription}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2">
                        <Label htmlFor="suspend-reason" className="text-xs">
                            Reason (shared with the creator)
                        </Label>
                        <Textarea
                            id="suspend-reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Explain why this plan is being suspended..."
                            maxLength={1000}
                            disabled={mutation.isPending}
                            className="min-h-24 text-sm"
                        />
                    </div>
                    {error && (
                        <p className="text-destructive text-sm">{error}</p>
                    )}
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={mutation.isPending}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={handleConfirm}
                            disabled={mutation.isPending || !reason.trim()}
                        >
                            {mutation.isPending
                                ? 'Suspending…'
                                : isSlot
                                  ? 'Suspend slot'
                                  : isRecurringTemplate
                                    ? 'Suspend whole plan'
                                    : 'Suspend & refund'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
