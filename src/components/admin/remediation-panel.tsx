import * as React from 'react'
import { CheckCircle2Icon, EyeIcon, PlayIcon, ShieldAlertIcon } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

import type {
    AdminRole,
    RemediationAction,
    RemediationContext,
} from '@/types/crisis'
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
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { canApply } from '@/lib/crisis-copy'
import { cn } from '@/lib/utils'
import { DivergenceCard } from '@/components/admin/divergence-card'

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
/**
 * Extra per-action inputs the generic preview/apply flow can't express with
 * just a reason. `force_transaction_status` (Phase 5e) carries the operator's
 * chosen target status here. Structurally matches the same-named type in
 * `queries/crisis.ts` — kept local so this presentational component keeps its
 * zero-runtime-dependency-on-the-API contract.
 */
export interface RemediationActionParams {
    targetStatus?: string
}

/** Action key that requires the operator to pick a target status first. */
const TXN_FORCE_STATUS_KEY = 'force_transaction_status'

/**
 * Statuses the operator may force a transaction into (Phase 5e). Mirrors
 * `transactionOptions.STATUS` in beens-api; the backend re-validates. COMPLETED
 * settles the platform fee, FAILED reverses splits — both surfaced in the
 * preview before apply.
 */
const FORCE_STATUS_OPTIONS = [
    'COMPLETED',
    'FAILED',
    'ESCALATED',
    'PROCESSING',
    'PENDING',
    'ESCROW',
] as const

export interface RemediationPanelProps {
    context: RemediationContext
    /** Current admin user's role — drives apply-button gating. */
    actorRole: AdminRole
    /**
     * Preview hook. Should return a plain-language diff string (e.g.
     * "Will mark txn 6a3a... → COMPLETED + create REFUND credit 58.5 THB").
     */
    onPreview: (
        action: RemediationAction,
        params?: RemediationActionParams,
    ) => Promise<string>
    /**
     * Apply hook. Reason is mandatory. Returns the audit entry id and an
     * optional plain-language result summary — the success panel shows it
     * in place of the preview text (Phase 9 surfaces the phantom reverse's
     * `withdrawableDelta = ฿0` proof here).
     */
    onApply: (
        action: RemediationAction,
        reason: string,
        params?: RemediationActionParams,
    ) => Promise<{ auditEntryId: string; summary?: string }>
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
    // Phase 5e — operator-chosen target status for force_transaction_status.
    // Unused by every other action.
    const [targetStatus, setTargetStatus] = React.useState('')
    const [error, setError] = React.useState<string | null>(null)
    const [success, setSuccess] = React.useState<{
        action: RemediationAction
        auditEntryId: string
        summary?: string
    } | null>(null)

    const recommended = context.actions.find((a) => a.recommended)
    const needsTargetStatus = activeAction?.key === TXN_FORCE_STATUS_KEY

    const runPreview = async (
        action: RemediationAction,
        params?: RemediationActionParams,
    ) => {
        setPreviewText(null)
        setError(null)
        setPreviewLoading(true)
        try {
            const diff = await onPreview(action, params)
            setPreviewText(diff)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Preview failed')
        } finally {
            setPreviewLoading(false)
        }
    }

    const handleOpen = async (action: RemediationAction) => {
        setActiveAction(action)
        setPreviewText(null)
        setReason('')
        setTargetStatus('')
        setError(null)
        setSuccess(null)
        // force_transaction_status has nothing to preview until the operator
        // picks a target status — defer the preview to the select's onChange.
        if (action.key === TXN_FORCE_STATUS_KEY) return
        await runPreview(action)
    }

    const handleTargetStatusChange = async (next: string) => {
        setTargetStatus(next)
        if (activeAction && next) {
            await runPreview(activeAction, { targetStatus: next })
        } else {
            setPreviewText(null)
        }
    }

    const handleApply = async () => {
        if (!activeAction) return
        if (!reason.trim()) {
            setError('A reason is required to apply this action.')
            return
        }
        if (needsTargetStatus && !targetStatus) {
            setError('Choose a target status before applying.')
            return
        }
        const params: RemediationActionParams | undefined = needsTargetStatus
            ? { targetStatus }
            : undefined
        setError(null)
        setApplyLoading(true)
        try {
            const result = await onApply(activeAction, reason.trim(), params)
            setSuccess({
                action: activeAction,
                auditEntryId: result.auditEntryId,
                summary: result.summary,
            })
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
                                {(success.summary ?? previewText) && (
                                    <pre className="whitespace-pre-wrap font-mono leading-relaxed">
                                        {success.summary ?? previewText}
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
                                {needsTargetStatus && (
                                    <div className="space-y-1">
                                        <Label
                                            htmlFor="force-target-status"
                                            className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                                        >
                                            Target status (required)
                                        </Label>
                                        <select
                                            id="force-target-status"
                                            value={targetStatus}
                                            onChange={(e) =>
                                                handleTargetStatusChange(e.target.value)
                                            }
                                            className="h-9 w-full rounded-md border bg-background px-2 text-xs"
                                        >
                                            <option value="">Select a status…</option>
                                            {FORCE_STATUS_OPTIONS.map((s) => (
                                                <option key={s} value={s}>
                                                    {s}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-[11px] text-muted-foreground">
                                            COMPLETED settles the platform fee; FAILED reverses
                                            all splits. Other statuses change state only.
                                        </p>
                                    </div>
                                )}

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
                                        (needsTargetStatus && !targetStatus) ||
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
    const button = (
        <Button
            size="sm"
            variant={action.recommended ? 'default' : 'outline'}
            disabled={!actorCanApply}
            onPointerDown={(e) => {
                // Stop the open-click from bubbling into the overlay that's
                // about to mount — otherwise the same pointer event is
                // interpreted as "click outside the dialog" and dismisses it
                // immediately.
                e.stopPropagation()
            }}
            onClick={(e) => {
                e.stopPropagation()
                onOpen()
            }}
            className="h-8 shrink-0 gap-1"
        >
            {action.recommended ? (
                <PlayIcon className="size-3" />
            ) : (
                <EyeIcon className="size-3" />
            )}
            Preview
        </Button>
    )

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
            {/* Phase 8 — below-min-role operators see the button disabled with
                a tooltip explaining the requirement. base-ui keeps a disabled
                trigger hoverable, so the tooltip still fires. */}
            {actorCanApply ? (
                button
            ) : (
                <Tooltip>
                    <TooltipTrigger render={button} />
                    <TooltipContent side="left">
                        Requires {action.minRole.toLowerCase()} or higher.
                    </TooltipContent>
                </Tooltip>
            )}
        </div>
    )
}
