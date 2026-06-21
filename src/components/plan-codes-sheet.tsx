'use client'

import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'

import type {
  PlanCodeEntry,
  PlanCodeType,
  SetPlanStatusParams,
} from '@/server/api/plans'
import { DetailSheet } from '@/components/detail-sheet'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  getPlanCodesOptions,
  issuePlanCodeOptions,
  markParticipantOptions,
  resendPlanCodeOptions,
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

  const issueMutation = useMutation({
    ...issuePlanCodeOptions,
    onSuccess: (res: any) => {
      const n = res?.data?.issued ?? 0
      ok(n > 0 ? `Issued ${n} code(s)` : 'Nothing to issue (already set?)')
      invalidate()
    },
    onError,
  })
  const resendMutation = useMutation({
    ...resendPlanCodeOptions,
    onSuccess: () => {
      ok('Code notification re-sent')
      invalidate()
    },
    onError,
  })
  const statusMutation = useMutation({
    ...setPlanStatusOptions,
    onSuccess: () => {
      ok('Status updated and jobs rescheduled')
      invalidate()
    },
    onError,
  })
  const markMutation = useMutation({
    ...markParticipantOptions,
    onSuccess: () => {
      ok('Participant updated')
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

  const busy =
    issueMutation.isPending ||
    resendMutation.isPending ||
    statusMutation.isPending ||
    markMutation.isPending ||
    scheduleMutation.isPending

  const issue = (
    entry: PlanCodeEntry,
    type: PlanCodeType,
    opts: { code?: string; regenerate?: boolean } = {},
  ) => {
    if (!planId || !entry.participantId) return
    issueMutation.mutate({
      planId,
      type,
      participantId: entry.participantId,
      code: opts.code || undefined,
      regenerate: opts.regenerate,
    })
  }

  const renderCodeRow = (entry: PlanCodeEntry, type: PlanCodeType) => {
    const key = `${entry.entryId}:${type}`
    const current = type === 'start' ? entry.startCode : entry.endCode
    const genAt = type === 'start' ? entry.startCodeGeneratedAt : entry.endCodeGeneratedAt
    const enteredAt = type === 'start' ? entry.startCodeEnteredAt : entry.endCodeEnteredAt
    const attempts = type === 'start' ? entry.startCodeAttempts : entry.endCodeAttempts
    const typed = codeInputs[key] ?? ''

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
        <div className="flex items-center gap-2">
          <Input
            value={typed}
            onChange={(e) => setInput(key, e.target.value)}
            placeholder="4-digit"
            inputMode="numeric"
            className="h-8 w-24 font-mono"
            disabled={busy || !entry.participantId}
          />
          {!current ? (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={busy || typed.length !== 4}
                onClick={() => issue(entry, type, { code: typed })}
              >
                Issue typed
              </Button>
              <Button
                size="sm"
                disabled={busy}
                onClick={() => issue(entry, type)}
              >
                Auto-generate
              </Button>
            </>
          ) : (
            <>
              <AlertDialog>
                <AlertDialogTrigger
                  render={<Button size="sm" variant="outline" disabled={busy} />}
                >
                  Re-issue
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Re-issue {type} code?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This overwrites the current {type} code
                      {typed.length === 4 ? ` with ${typed}` : ' with a new random value'}{' '}
                      and clears any prior entry/attempts. The joiner/host will be
                      re-notified.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() =>
                        issue(entry, type, {
                          code: typed.length === 4 ? typed : undefined,
                          regenerate: true,
                        })
                      }
                    >
                      Re-issue
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  planId &&
                  entry.participantId &&
                  resendMutation.mutate({
                    planId,
                    type,
                    participantId: entry.participantId,
                  })
                }
              >
                Re-send
              </Button>
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

          {/* ── Issue-to-all shortcut ── */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={busy || !planId}
              onClick={() => planId && issueMutation.mutate({ planId, type: 'start' })}
            >
              Issue all start codes
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy || !planId}
              onClick={() => planId && issueMutation.mutate({ planId, type: 'end' })}
            >
              Issue all end codes
            </Button>
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
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy || !entry.participantId}
                    onClick={() =>
                      planId &&
                      entry.participantId &&
                      markMutation.mutate({
                        planId,
                        participantId: entry.participantId,
                        stage: 'present',
                      })
                    }
                  >
                    Mark present
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy || !entry.participantId}
                    onClick={() =>
                      planId &&
                      entry.participantId &&
                      markMutation.mutate({
                        planId,
                        participantId: entry.participantId,
                        stage: 'completed',
                      })
                    }
                  >
                    Mark completed
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </DetailSheet>
  )
}
