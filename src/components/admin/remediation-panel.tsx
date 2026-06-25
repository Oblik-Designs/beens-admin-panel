import * as React from 'react'
import { CheckCircle2Icon, EyeIcon, PlayIcon, ShieldAlertIcon } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { canApply } from '@/lib/crisis-copy'
import { cn } from '@/lib/utils'
import { DivergenceCard } from '@/components/admin/divergence-card'
import type {
    AdminRole,
    RemediationAction,
    RemediationContext,
} from '@/types/crisis'

/**
 * Remediation panel — the operator's action surface on every 360 page.
 * Renders the recommended sentence, optional DivergenceCard, and the
 * preview/apply buttons for each action.
 *
 * Behavior contract (from admin-crisis-implementation-plan.md §7.2):
 *   - Preview is open to MODERATOR+; clicking it just hydrates a diff.
 *   - Apply is gated by the action's `minRole`. Below-min-role operators
 *     see the button disabled with an explanatory tooltip.
 *   - A reason is required on apply (last-resort manual overrides).
 *
 * This component is *presentational* — the actual `previewAction()` /
 * `applyAction()` calls are passed in by the parent route, so this file
 * has zero runtime dependency on the API. Wires up cleanly once Phase 5
 * endpoints ship.
 */
export interface RemediationPanelProps {
    context: RemediationContext
    /** Current admin user's role — drives apply-button gating. */
    actorRole: AdminRole
    /**
     * Preview hook. Should return a plain-language diff string (e.g.
     * "Will mark txn 6a3a... → COMPLETED + create REFUND credit 58.5 THB").
     */
    onPreview: (action: RemediationAction) => Promise<string>
    /**
     * Apply hook. Reason is mandatory. Should return the audit entry id.
     */
    onApply: (
        action: RemediationAction,
        reason: string,
    ) => Promise<{ auditEntryId: string }>
    /**
     * Optional render slot at the bottom of the Actions section. The
     * User 360 sidebar uses this to attach a "Delete user" button next
     * to the dynamic Sumsub actions without coupling the panel to that
     * specific destructive flow.
     */
    footerSlot?: React.ReactNode
    className?: string
}

export function RemediationPanel({
    context,
    actorRole,
    onPreview,
    onApply,
    footerSlot,
    className,
}: RemediationPanelProps) {
    const queryClient = useQueryClient()
    const [activeAction, setActiveAction] =
        React.useState<RemediationAction | null>(null)
    const [previewText, setPreviewText] = React.useState<string | null>(null)
    const [previewLoading, setPreviewLoading] = React.useState(false)
    const [applyLoading, setApplyLoading] = React.useState(false)
    const [reason, setReason] = React.useState('')
    const [error, setError] = React.useState<string | null>(null)
    const [success, setSuccess] = React.useState<{
        action: RemediationAction
        auditEntryId: string
    } | null>(null)

    const recommended = context.actions.find((a) => a.recommended)

    const handleOpen = async (action: RemediationAction) => {
        setActiveAction(action)
        setPreviewText(null)
        setReason('')
        setError(null)
        setSuccess(null)
        setPreviewLoading(true)
        try {
            const diff = await onPreview(action)
            setPreviewText(diff)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Preview failed')
        } finally {
            setPreviewLoading(false)
        }
    }

    const handleApply = async () => {
        if (!activeAction) return
        if (!reason.trim()) {
            setError('A reason is required to apply this action.')
            return
        }
        setError(null)
        setApplyLoading(true)
        try {
            const result = await onApply(activeAction, reason.trim())
            setSuccess({ action: activeAction, auditEntryId: result.auditEntryId })
            // Refetch anything that might show the new audit row (timelines
            // pull from /admin/.../timeline which merges adminaudits; the
            // remediation-context itself may now report a different signal
            // if the action mutated state).
            queryClient.invalidateQueries({ queryKey: ['crisis', 'timeline'] })
            queryClient.invalidateQueries({
                queryKey: ['crisis', 'remediation', context.targetModel, context.targetId],
            })
            // Bust the entity-detail cache the parent 360 route reads from
            // (User Admin card, Plan summary, Transaction header). Without
            // this, the action changed the DB but the sidebar shows stale
            // pre-action state until manual refresh.
            queryClient.invalidateQueries({ queryKey: entityCacheKey(context.targetModel) })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Apply failed')
        } finally {
            setApplyLoading(false)
        }
    }

    const handleSheetClose = () => {
        setActiveAction(null)
        setSuccess(null)
    }

    return (
        <div className={cn('space-y-4', className)}>
            <div className="space-y-2 rounded-lg border bg-muted/40 px-4 py-3">
                <div className="flex items-center gap-2">
                    <ShieldAlertIcon className="size-3 text-muted-foreground" />
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        Remediation
                    </span>
                </div>
                <p className="text-sm leading-relaxed">{context.summary}</p>
                {recommended && (
                    <div className="flex items-center justify-between gap-4 text-sm">
                        <span className="text-muted-foreground">Recommended</span>
                        <span className="font-medium">{recommended.label}</span>
                    </div>
                )}
            </div>

            {context.divergence && (
                <DivergenceCard
                    dbValue={context.divergence.dbValue}
                    providerValue={context.divergence.providerValue}
                    cause={context.divergence.cause}
                />
            )}

            <div className="space-y-2 rounded-lg border bg-muted/40 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Actions
                </div>
                <div className="divide-y divide-border">
                    {context.actions.map((action) => {
                        const canApplyThis = canApply(actorRole, action.minRole)
                        return (
                            <ActionRow
                                key={action.key}
                                action={action}
                                canApply={canApplyThis}
                                onOpen={() => handleOpen(action)}
                            />
                        )
                    })}
                </div>
                {footerSlot && (
                    <div className="border-t pt-3">{footerSlot}</div>
                )}
            </div>

            <Sheet
                open={!!activeAction}
                onOpenChange={(open) => {
                    // While the preview/apply request is in flight, ignore
                    // dismiss attempts — otherwise an accidental outside
                    // click, the bubbling open-click, or a focus shift
                    // drops the in-flight result on the floor before the
                    // operator can see it.
                    if (previewLoading || applyLoading) return
                    if (!open) handleSheetClose()
                }}
            >
                <SheetContent className="flex flex-col gap-4">
                    <SheetHeader>
                        <SheetTitle>{activeAction?.label}</SheetTitle>
                        <SheetDescription>
                            {success
                                ? 'Applied. The audit log has captured this action.'
                                : 'Preview the change first. Apply requires a reason — it goes into the audit log.'}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="flex-1 space-y-3 overflow-y-auto px-4">
                        {success ? (
                            <div className="space-y-2 rounded-md border border-emerald-300 bg-emerald-50/60 p-3 text-xs text-emerald-900 dark:border-emerald-700/60 dark:bg-emerald-950/30 dark:text-emerald-100">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2Icon className="size-4" />
                                    <span className="font-medium">
                                        {success.action.label} — applied
                                    </span>
                                </div>
                                {previewText && (
                                    <pre className="whitespace-pre-wrap font-mono leading-relaxed">
                                        {previewText}
                                    </pre>
                                )}
                                {success.auditEntryId && (
                                    <p className="text-[11px] opacity-80">
                                        Audit entry:{' '}
                                        <code className="font-mono">
                                            {success.auditEntryId}
                                        </code>
                                    </p>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="space-y-1">
                                    <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                        Preview
                                    </Label>
                                    <div className="min-h-20 rounded-md border bg-muted/30 p-3 text-xs">
                                        {previewLoading ? (
                                            <span className="text-muted-foreground">
                                                Computing preview…
                                            </span>
                                        ) : previewText ? (
                                            <pre className="whitespace-pre-wrap font-mono leading-relaxed">
                                                {previewText}
                                            </pre>
                                        ) : (
                                            <span className="text-muted-foreground">
                                                No preview yet.
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <Label
                                        htmlFor="remediation-reason"
                                        className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                                    >
                                        Reason (required)
                                    </Label>
                                    <Textarea
                                        id="remediation-reason"
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        placeholder="Why is this remediation needed? Link the ticket or incident."
                                        rows={4}
                                        className="text-xs"
                                    />
                                </div>

                                {error && (
                                    <p className="text-xs text-destructive" role="alert">
                                        {error}
                                    </p>
                                )}
                            </>
                        )}
                    </div>

                    <SheetFooter>
                        {success ? (
                            <Button onClick={handleSheetClose}>Close</Button>
                        ) : (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={handleSheetClose}
                                    disabled={applyLoading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleApply}
                                    disabled={
                                        applyLoading ||
                                        !reason.trim() ||
                                        !activeAction ||
                                        !canApply(actorRole, activeAction.minRole)
                                    }
                                >
                                    {applyLoading ? 'Applying…' : 'Apply'}
                                </Button>
                            </>
                        )}
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    )
}

/** Coarse query-key prefix for each entity 360. Apply mutations need
 * to bust the entity-detail cache so the sidebar/header reflects the
 * change without a manual refresh. The crisis-* queries handle
 * themselves (timeline + remediation-context invalidations above);
 * this covers the rest. Broad prefix is intentional — any per-entity
 * derived query also refetches, which is what we want here. */
function entityCacheKey(targetModel: RemediationContext['targetModel']) {
    switch (targetModel) {
        case 'User':
            return ['users']
        case 'Plan':
            return ['plans']
        case 'Transaction':
            return ['transactions']
        default:
            return [targetModel.toLowerCase()]
    }
}

interface ActionRowProps {
    action: RemediationAction
    canApply: boolean
    onOpen: () => void
}

function ActionRow({ action, canApply: actorCanApply, onOpen }: ActionRowProps) {
    return (
        <div className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
            <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-baseline gap-2">
                    <span className="truncate text-sm font-medium">{action.label}</span>
                    {action.recommended && (
                        <span className="text-[10px] uppercase tracking-wide text-primary">
                            Recommended
                        </span>
                    )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                    Min role: {action.minRole.toLowerCase()}
                </p>
            </div>
            <Button
                size="sm"
                variant={action.recommended ? 'default' : 'outline'}
                disabled={!actorCanApply}
                onPointerDown={(e) => {
                    // Stop the open-click from bubbling into the Radix
                    // overlay that's about to mount — otherwise the same
                    // pointer event is interpreted as "click outside the
                    // dialog" and dismisses it immediately.
                    e.stopPropagation()
                }}
                onClick={(e) => {
                    e.stopPropagation()
                    onOpen()
                }}
                title={
                    actorCanApply
                        ? undefined
                        : `Requires ${action.minRole.toLowerCase()} or higher.`
                }
                className="h-8 shrink-0 gap-1"
            >
                {action.recommended ? (
                    <PlayIcon className="size-3" />
                ) : (
                    <EyeIcon className="size-3" />
                )}
                Preview
            </Button>
        </div>
    )
}
