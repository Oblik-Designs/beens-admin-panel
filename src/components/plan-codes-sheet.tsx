'use client'

import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'

import type {
  ForceJoinParams,
  IssuePlanCodeParams,
  MarkParticipantParams,
  PlanCodeEntry,
  PlanCodeType,
  ResendPlanCodeParams,
  ResetCodeAttemptsParams,
  SetPlanStatusParams,
} from '@/server/api/plans'
import { DetailSheet } from '@/components/detail-sheet'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import {
  forceJoinOptions,
  getPlanCodesOptions,
  issuePlanCodeOptions,
  markParticipantOptions,
  resendPlanCodeOptions,
  resetCodeAttemptsOptions,
  setPlanScheduleOptions,
  setPlanStatusOptions,
} from '@/queries/plans'

type PlanCodesSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  planId: string | null
}

const STATUS_OPTIONS: Array<SetPlanStatusParams['status']> = [
  'Active',
  'In Progress',
  'Completed',
  'Cancelled',
]

function fmt(value?: string | null) {
  if (!value) return '—'
  try {
    const d = parseISO(value)
    if (Number.isNaN(d.getTime())) return value
    return format(d, 'MMM dd, hh:mm a')
  } catch {
    return value
  }
}

// ─── Preview-then-apply dialog ──────────────────────────────────────
//
// Phase 5d standard: every mutating plan endpoint accepts `dryRun`.
// This helper opens an AlertDialog on trigger click, fires the preview
// immediately, and collects a reason before letting the operator apply.
// The trigger is rendered inline so existing button layouts are
// preserved — callers swap a `<Button>` for `<PreviewApplyButton>` and
// supply the preview/apply call params.
type PreviewState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'ready'; summary: string }
  | { phase: 'error'; message: string }

function PreviewApplyButton<
  TPreview,
  TApply extends { reason?: string },
>(props: {
  triggerLabel: React.ReactNode
  triggerVariant?: React.ComponentProps<typeof Button>['variant']
  triggerSize?: React.ComponentProps<typeof Button>['size']
  disabled?: boolean
  title: string
  description?: React.ReactNode
  /** Default reason the textarea seeds with — operator can edit. */
  reasonPlaceholder?: string
  previewParams: TPreview
  applyParams: TApply
  preview: (p: TPreview) => Promise<{ data?: { summary?: string } } | any>
  apply: (p: TApply) => Promise<{ data?: { summary?: string } } | any>
  onApplied?: (summary: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [state, setState] = React.useState<PreviewState>({ phase: 'idle' })
  const [reason, setReason] = React.useState('')
  const [applying, setApplying] = React.useState(false)
  const [applyError, setApplyError] = React.useState<string | null>(null)

  const runPreview = React.useCallback(async () => {
    setState({ phase: 'loading' })
    try {
      const res: any = await props.preview(props.previewParams)
      const summary =
        res?.data?.summary ?? res?.summary ?? 'Preview returned no summary.'
      setState({ phase: 'ready', summary })
    } catch (err) {
      setState({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Preview failed',
      })
    }
  }, [props])

  React.useEffect(() => {
    if (open) {
      setReason('')
      setApplyError(null)
      runPreview()
    } else {
      setState({ phase: 'idle' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const onApply = async () => {
    if (!reason.trim()) {
      setApplyError('A reason is required to apply this action.')
      return
    }
    setApplyError(null)
    setApplying(true)
    try {
      const res: any = await props.apply({
        ...props.applyParams,
        reason: reason.trim(),
      })
      const summary = res?.data?.summary ?? res?.summary ?? 'Applied.'
      props.onApplied?.(summary)
      setOpen(false)
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : 'Apply failed')
    } finally {
      setApplying(false)
    }
  }

  return (
    <>
      <Button
        size={props.triggerSize ?? 'sm'}
        variant={props.triggerVariant ?? 'outline'}
        disabled={props.disabled}
        onClick={() => setOpen(true)}
      >
        {props.triggerLabel}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{props.title}</AlertDialogTitle>
            {props.description && (
              <AlertDialogDescription>{props.description}</AlertDialogDescription>
            )}
          </AlertDialogHeader>

          <div className="space-y-3">
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
              {state.phase === 'loading' && (
                <span className="text-muted-foreground">Loading preview…</span>
              )}
              {state.phase === 'ready' && <span>{state.summary}</span>}
              {state.phase === 'error' && (
                <span className="text-destructive">{state.message}</span>
              )}
              {state.phase === 'idle' && (
                <span className="text-muted-foreground">—</span>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Reason (required to apply)</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={props.reasonPlaceholder ?? 'Why are you doing this?'}
                rows={3}
              />
              {applyError && (
                <p className="text-xs text-destructive">{applyError}</p>
              )}
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={applying}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={
                applying ||
                state.phase === 'loading' ||
                state.phase === 'error' ||
                !reason.trim()
              }
              onClick={(e) => {
                e.preventDefault()
                onApply()
              }}
            >
              {applying ? 'Applying…' : 'Apply'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function PlanCodesSheet({
  open,
  onOpenChange,
  planId,
}: PlanCodesSheetProps) {
  const queryClient = useQueryClient()
  // Inline status banner — the admin panel has no toast library, so
  // feedback is surfaced via an Alert at the top of the sheet.
  const [feedback, setFeedback] = React.useState<
    { type: 'success' | 'destructive'; msg: string } | null
  >(null)

  const { data, isLoading } = useQuery({
    ...getPlanCodesOptions(planId ?? ''),
    enabled: open && !!planId,
  })
  const plan = data?.data

  // Per-entry typed code inputs, keyed `${entryId}:${type}`.
  const [codeInputs, setCodeInputs] = React.useState<Record<string, string>>({})
  const setInput = (key: string, val: string) =>
    setCodeInputs((prev) => ({ ...prev, [key]: val.replace(/\D/g, '').slice(0, 4) }))

  // Plan-level schedule editor.
  const [status, setStatus] = React.useState<string>('')
  const [startDate, setStartDate] = React.useState('')
  const [endDate, setEndDate] = React.useState('')
  const [timezone, setTimezone] = React.useState('')

  // Force-join target user id (operator types this when a paid joiner is
  // missing from currentParticipants).
  const [forceJoinUserId, setForceJoinUserId] = React.useState('')

  React.useEffect(() => {
    if (plan) {
      setStatus(plan.status ?? '')
      setTimezone(plan.timezone ?? '')
    }
  }, [plan])

  const invalidate = React.useCallback(() => {
    if (planId) {
      queryClient.invalidateQueries({ queryKey: ['plan', 'codes', planId] })
    }
    queryClient.invalidateQueries({ queryKey: ['plans'] })
  }, [planId, queryClient])

  const ok = (msg: string) => setFeedback({ type: 'success', msg })
  const onError = (e: unknown) =>
    setFeedback({
      type: 'destructive',
      msg: e instanceof Error ? e.message : 'Something went wrong',
    })

  // Apply mutations (dryRun=false runs server-side). Each PreviewApplyButton
  // owns its own preview call inline; these are only the apply fns.
  const issueMutation = useMutation({ ...issuePlanCodeOptions })
  const resendMutation = useMutation({ ...resendPlanCodeOptions })
  const markMutation = useMutation({ ...markParticipantOptions })
  const resetMutation = useMutation({ ...resetCodeAttemptsOptions })
  const forceJoinMutation = useMutation({ ...forceJoinOptions })

  // Plan-level mutations stay simple — these aren't part of Phase 5d's
  // preview-first scope (schedule + status are pre-Phase-5 endpoints).
  const statusMutation = useMutation({
    ...setPlanStatusOptions,
    onSuccess: () => {
      ok('Status updated and jobs rescheduled')
      invalidate()
    },
    onError,
  })
  const scheduleMutation = useMutation({
    ...setPlanScheduleOptions,
    onSuccess: () => {
      ok('Schedule updated and jobs rescheduled')
      invalidate()
    },
    onError,
  })

  const busy = statusMutation.isPending || scheduleMutation.isPending

  const onApplied = (msg: string) => {
    ok(msg)
    invalidate()
  }


  const renderCodeRow = (entry: PlanCodeEntry, type: PlanCodeType) => {
    const key = `${entry.entryId}:${type}`
    const current = type === 'start' ? entry.startCode : entry.endCode
    const genAt = type === 'start' ? entry.startCodeGeneratedAt : entry.endCodeGeneratedAt
    const enteredAt = type === 'start' ? entry.startCodeEnteredAt : entry.endCodeEnteredAt
    const attempts = type === 'start' ? entry.startCodeAttempts : entry.endCodeAttempts
    const typed = codeInputs[key] ?? ''

    if (!planId || !entry.participantId) return null

    const baseParams = { planId, type, participantId: entry.participantId }

    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
          <span>{type} code</span>
          <span className="font-mono text-sm normal-case tracking-normal text-foreground">
            {current ?? '—'}
          </span>
        </div>
        <div className="text-[11px] text-muted-foreground">
          generated {fmt(genAt)} · entered {fmt(enteredAt)} · attempts {attempts}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={typed}
            onChange={(e) => setInput(key, e.target.value)}
            placeholder="4-digit"
            inputMode="numeric"
            className="h-8 w-24 font-mono"
            disabled={busy}
          />
          {!current ? (
            <>
              <PreviewApplyButton<IssuePlanCodeParams, IssuePlanCodeParams>
                triggerLabel="Issue typed"
                triggerVariant="outline"
                disabled={typed.length !== 4}
                title={`Issue typed ${type} code`}
                description={`Sends notification + email with code ${typed}.`}
                reasonPlaceholder={`Issue ${type} code via panel`}
                previewParams={{ ...baseParams, code: typed, dryRun: true }}
                applyParams={{ ...baseParams, code: typed, dryRun: false }}
                preview={(p) => issueMutation.mutateAsync(p)}
                apply={(p) => issueMutation.mutateAsync(p)}
                onApplied={onApplied}
              />
              <PreviewApplyButton<IssuePlanCodeParams, IssuePlanCodeParams>
                triggerLabel="Auto-generate"
                triggerVariant="default"
                title={`Auto-generate ${type} code`}
                description="Mints a random 4-digit code and notifies the joiner + host."
                reasonPlaceholder={`Auto-issue ${type} code via panel`}
                previewParams={{ ...baseParams, dryRun: true }}
                applyParams={{ ...baseParams, dryRun: false }}
                preview={(p) => issueMutation.mutateAsync(p)}
                apply={(p) => issueMutation.mutateAsync(p)}
                onApplied={onApplied}
              />
            </>
          ) : (
            <>
              <PreviewApplyButton<IssuePlanCodeParams, IssuePlanCodeParams>
                triggerLabel="Re-issue"
                triggerVariant="outline"
                title={`Re-issue ${type} code`}
                description={`Overwrites the current ${type} code${typed.length === 4 ? ` with ${typed}` : ' with a new random value'} and clears prior entry/attempts. Re-notifies.`}
                reasonPlaceholder={`Re-issue ${type} code via panel`}
                previewParams={{
                  ...baseParams,
                  code: typed.length === 4 ? typed : undefined,
                  regenerate: true,
                  dryRun: true,
                }}
                applyParams={{
                  ...baseParams,
                  code: typed.length === 4 ? typed : undefined,
                  regenerate: true,
                  dryRun: false,
                }}
                preview={(p) => issueMutation.mutateAsync(p)}
                apply={(p) => issueMutation.mutateAsync(p)}
                onApplied={onApplied}
              />
              <PreviewApplyButton<ResendPlanCodeParams, ResendPlanCodeParams>
                triggerLabel="Re-send"
                triggerVariant="ghost"
                title={`Re-send ${type} code`}
                description="Re-fires the push + email for the existing code. No new value minted."
                reasonPlaceholder={`Re-send ${type} code via panel`}
                previewParams={{ ...baseParams, dryRun: true }}
                applyParams={{ ...baseParams, dryRun: false }}
                preview={(p) => resendMutation.mutateAsync(p)}
                apply={(p) => resendMutation.mutateAsync(p)}
                onApplied={onApplied}
              />
              {attempts > 0 && (
                <PreviewApplyButton<
                  ResetCodeAttemptsParams,
                  ResetCodeAttemptsParams
                >
                  triggerLabel={`Reset attempts (${attempts})`}
                  triggerVariant="ghost"
                  title={`Reset ${type} code attempts`}
                  description={`Zeroes ${type}CodeAttempts so the joiner can try again. Does not change the code value.`}
                  reasonPlaceholder={`Reset ${type} attempts via panel`}
                  previewParams={{
                    planId,
                    participantId: entry.participantId,
                    start: type === 'start',
                    end: type === 'end',
                    dryRun: true,
                  }}
                  applyParams={{
                    planId,
                    participantId: entry.participantId,
                    start: type === 'start',
                    end: type === 'end',
                    dryRun: false,
                  }}
                  preview={(p) => resetMutation.mutateAsync(p)}
                  apply={(p) => resetMutation.mutateAsync(p)}
                  onApplied={onApplied}
                />
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Manage codes"
      description="Issue, re-issue, or re-send start/end codes per joiner, and fix event scheduling."
    >
      {feedback && (
        <Alert variant={feedback.type} className="mb-1">
          <AlertDescription>{feedback.msg}</AlertDescription>
        </Alert>
      )}
      {isLoading || !plan ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          {/* ── Diagnostic header ── */}
          <div className="space-y-2 rounded-lg border bg-muted/40 px-4 py-3">
            <div className="text-sm font-medium">{plan.title ?? plan.planId}</div>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary">{plan.type ?? '—'}</Badge>
              <Badge variant="secondary">{plan.status ?? '—'}</Badge>
              {plan.isRecurring && <Badge variant="destructive">recurring template</Badge>}
              {plan.minsToStart != null && (
                <Badge variant="outline">starts in {plan.minsToStart}m</Badge>
              )}
              {plan.minsToEnd != null && (
                <Badge variant="outline">ends in {plan.minsToEnd}m</Badge>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground">
              start {fmt(plan.startDate)} · end {fmt(plan.endDate)} · tz{' '}
              {plan.timezone ?? '—'}
            </div>
            {plan.isRecurring && (
              <p className="text-xs text-destructive">
                Recurring templates never receive codes — act on the child slot
                instance instead.
              </p>
            )}
          </div>

          {/* ── Plan-level controls ── */}
          <div className="space-y-3 rounded-lg border px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Event controls
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus((v) ?? '')}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                disabled={busy || !planId || status === plan.status || !status}
                onClick={() =>
                  planId &&
                  statusMutation.mutate({
                    planId,
                    status: status as SetPlanStatusParams['status'],
                  })
                }
              >
                Apply
              </Button>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-xs">
                Fix schedule (wall-clock in the timezone below)
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8"
                />
                <Input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8"
                />
              </div>
              <Input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="IANA timezone e.g. Asia/Bangkok"
                className="h-8"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={busy || !planId || (!startDate && !endDate && !timezone)}
                onClick={() =>
                  planId &&
                  scheduleMutation.mutate({
                    planId,
                    startDate: startDate || undefined,
                    endDate: endDate || undefined,
                    timezone: timezone || undefined,
                  })
                }
              >
                Save schedule & reschedule jobs
              </Button>
            </div>
          </div>

          {/* ── Issue-to-all + Force-join shortcuts ── */}
          <div className="space-y-2 rounded-lg border px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Bulk + escape hatches
            </div>
            <div className="flex flex-wrap gap-2">
              {planId && (
                <>
                  <PreviewApplyButton<IssuePlanCodeParams, IssuePlanCodeParams>
                    triggerLabel="Issue all start codes"
                    triggerVariant="outline"
                    title="Issue start codes to all joiners"
                    description="Mints a fresh 4-digit start code for every joiner without one. Skips entries that already have one."
                    reasonPlaceholder="Bulk-issue start codes via panel"
                    previewParams={{ planId, type: 'start', dryRun: true }}
                    applyParams={{ planId, type: 'start', dryRun: false }}
                    preview={(p) => issueMutation.mutateAsync(p)}
                    apply={(p) => issueMutation.mutateAsync(p)}
                    onApplied={onApplied}
                  />
                  <PreviewApplyButton<IssuePlanCodeParams, IssuePlanCodeParams>
                    triggerLabel="Issue all end codes"
                    triggerVariant="outline"
                    title="Issue end codes to all joiners"
                    description="Mints a fresh 4-digit end code for every joiner without one."
                    reasonPlaceholder="Bulk-issue end codes via panel"
                    previewParams={{ planId, type: 'end', dryRun: true }}
                    applyParams={{ planId, type: 'end', dryRun: false }}
                    preview={(p) => issueMutation.mutateAsync(p)}
                    apply={(p) => issueMutation.mutateAsync(p)}
                    onApplied={onApplied}
                  />
                </>
              )}
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label className="text-xs">
                Force-join a paid user missing from currentParticipants
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  value={forceJoinUserId}
                  onChange={(e) => setForceJoinUserId(e.target.value.trim())}
                  placeholder="user _id (must have a COMPLETED PLAN txn)"
                  className="h-8 font-mono text-xs"
                />
                {planId && forceJoinUserId.length >= 12 && (
                  <PreviewApplyButton<ForceJoinParams, ForceJoinParams>
                    triggerLabel="Force-join"
                    triggerVariant="destructive"
                    title="Force-enrol paid user"
                    description="Adds this user to currentParticipants + creates a participantEntries row bound to their most recent COMPLETED PLAN transaction. Refuses unpaid users."
                    reasonPlaceholder="Force-join via panel (paid user missing from currentParticipants)"
                    previewParams={{
                      planId,
                      participantId: forceJoinUserId,
                      dryRun: true,
                    }}
                    applyParams={{
                      planId,
                      participantId: forceJoinUserId,
                      dryRun: false,
                    }}
                    preview={(p) => forceJoinMutation.mutateAsync(p)}
                    apply={(p) => forceJoinMutation.mutateAsync(p)}
                    onApplied={(s) => {
                      onApplied(s)
                      setForceJoinUserId('')
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* ── Per-joiner ── */}
          <div className="space-y-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Joiners ({plan.entries.length})
            </div>
            {plan.entries.length === 0 && (
              <p className="text-sm text-muted-foreground">No joiners yet.</p>
            )}
            {plan.entries.map((entry) => (
              <div
                key={entry.entryId}
                className="space-y-3 rounded-lg border px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {entry.displayName ?? entry.participantId ?? 'Unknown'}
                  </span>
                  <Badge variant="secondary">{entry.participantStatus ?? '—'}</Badge>
                </div>
                {renderCodeRow(entry, 'start')}
                {renderCodeRow(entry, 'end')}
                <div className="flex flex-wrap gap-2 pt-1">
                  {planId && entry.participantId && (
                    <>
                      <PreviewApplyButton<
                        MarkParticipantParams,
                        MarkParticipantParams
                      >
                        triggerLabel="Mark present"
                        triggerVariant="ghost"
                        // STARTED already implies present; COMPLETED is past it.
                        disabled={
                          entry.participantStatus === 'STARTED' ||
                          entry.participantStatus === 'COMPLETED'
                        }
                        title="Mark participant present"
                        description="Sets participantStatus to STARTED. If the plan ends in <30m, also mints the end code."
                        reasonPlaceholder="Mark present via panel"
                        previewParams={{
                          planId,
                          participantId: entry.participantId,
                          stage: 'present',
                          dryRun: true,
                        }}
                        applyParams={{
                          planId,
                          participantId: entry.participantId,
                          stage: 'present',
                          dryRun: false,
                        }}
                        preview={(p) => markMutation.mutateAsync(p)}
                        apply={(p) => markMutation.mutateAsync(p)}
                        onApplied={onApplied}
                      />
                      <PreviewApplyButton<
                        MarkParticipantParams,
                        MarkParticipantParams
                      >
                        triggerLabel="Mark completed"
                        triggerVariant="ghost"
                        disabled={entry.participantStatus === 'COMPLETED'}
                        title="Mark participant completed"
                        description="Sets participantStatus to COMPLETED."
                        reasonPlaceholder="Mark completed via panel"
                        previewParams={{
                          planId,
                          participantId: entry.participantId,
                          stage: 'completed',
                          dryRun: true,
                        }}
                        applyParams={{
                          planId,
                          participantId: entry.participantId,
                          stage: 'completed',
                          dryRun: false,
                        }}
                        preview={(p) => markMutation.mutateAsync(p)}
                        apply={(p) => markMutation.mutateAsync(p)}
                        onApplied={onApplied}
                      />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </DetailSheet>
  )
}
