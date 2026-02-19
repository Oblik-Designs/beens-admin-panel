'use client'

import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { DetailSheet } from '@/components/detail-sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  closeTicketOptions,
  resolvePlanReportTicketOptions,
  resolveUserReportTicketOptions,
} from '@/queries/tickets'
import type { Ticket } from '@/server/api/tickets'
import {
  BanIcon,
  CalendarIcon,
  CircleXIcon,
  ReceiptCentIcon,
  UserIcon,
} from 'lucide-react'
import { Separator } from './ui/separator'
import { format, parseISO } from 'date-fns'

function getReporterName(reporter: Ticket['reporter']) {
  if (!reporter) return 'Unknown'
  return (
    reporter.displayName ||
    `${reporter.firstName ?? ''} ${reporter.lastName ?? ''}`.trim() ||
    'Unknown'
  )
}

function formatDateTime(value?: string) {
  if (!value) return '-'
  console.log('value: ', value)

  let date: Date

  try {
    date = parseISO(value)
    console.log('date: ', date)
    if (Number.isNaN(date.getTime())) {
      throw new Error('Invalid ISO date')
    }
  } catch {
    const fallback = new Date(value)
    if (Number.isNaN(fallback.getTime())) return value
    date = fallback
  }

  return format(date, 'MMM dd yyyy, hh:mm a')
}

type TicketActionSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticket: Ticket | null
  onActionSuccess?: (message: string) => void
}

type ActionTab = 'remove-plan' | 'close' | 'refund' | 'ban-user' | 'warn-user'

export function TicketActionSheet({
  open,
  onOpenChange,
  ticket,
  onActionSuccess,
}: TicketActionSheetProps) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = React.useState<ActionTab>('remove-plan')

  // Remove Plan
  const [removePlanMessage, setRemovePlanMessage] = React.useState('')
  const removePlanMutation = useMutation({
    ...resolvePlanReportTicketOptions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      onOpenChange(false)
      setRemovePlanMessage('')
      onActionSuccess?.('Plan removed successfully.')
    },
  })

  // Close ticket
  const [closeMessage, setCloseMessage] = React.useState('')
  const closeMutation = useMutation({
    ...closeTicketOptions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      onOpenChange(false)
      setCloseMessage('')
      onActionSuccess?.('Ticket closed successfully.')
    },
  })

  // Refund Reporter
  const [refundType, setRefundType] = React.useState<
    'Partial Refund' | 'Full Refund'
  >('Partial Refund')
  const [refundAmount, setRefundAmount] = React.useState('')
  const [refundMessage, setRefundMessage] = React.useState('')
  const refundMutation = useMutation({
    ...resolvePlanReportTicketOptions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      onOpenChange(false)
      setRefundType('Partial Refund')
      setRefundAmount('')
      setRefundMessage('')
      onActionSuccess?.('Refund submitted successfully.')
    },
    onError: (error) => {
      console.error('Error resolving plan report: ', error)
    },
  })

  // User report (ban / warn)
  const [banUntil, setBanUntil] = React.useState('')
  const [banMessage, setBanMessage] = React.useState('')
  const [warnMessage, setWarnMessage] = React.useState('')

  const userResolveMutation = useMutation({
    ...resolveUserReportTicketOptions,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      onOpenChange(false)
      setBanUntil('')
      setBanMessage('')
      setWarnMessage('')
      const action = (variables as any)?.action
      if (action === 'BAN' || action === 'SUSPENSION') {
        onActionSuccess?.('User banned successfully.')
      } else if (action === 'WARNING') {
        onActionSuccess?.('User warned successfully.')
      } else {
        onActionSuccess?.('User report resolved successfully.')
      }
    },
    onError: (error) => {
      console.error('Error resolving user report: ', error)
    },
  })

  const handleRemovePlan = (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticket?._id || !removePlanMessage.trim()) return
    removePlanMutation.mutate({
      ticketId: ticket._id,
      action: 'SUSPENSION',
      escalationReason: removePlanMessage.trim(),
    })
  }

  const handleCloseTicket = (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticket?._id || !closeMessage.trim()) return
    closeMutation.mutate({
      ticketId: ticket._id,
      note: closeMessage.trim(),
    })
  }

  const handleRefundReporter = (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticket?._id || !refundMessage.trim()) return
    const amount = Number(refundAmount.trim())
    if (Number.isNaN(amount) || amount <= 0) return
    const isPartial = refundType === 'Partial Refund'
    refundMutation.mutate({
      ticketId: ticket._id,
      action: isPartial ? 'PARTIAL_REFUND' : 'REFUND',
      escalationReason: refundMessage.trim(),
      refundAmount: amount,
    })
  }

  const handleBanUser = (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticket?._id || !banUntil || !banMessage.trim()) return
    const disabledUntil = new Date(banUntil).toISOString()
    console.log('disabledUntil: ', disabledUntil)
    userResolveMutation.mutate({
      ticketId: ticket._id,
      action: 'BAN',
      disabledUntil: disabledUntil,
      escalationReason: banMessage.trim(),
    })
  }

  const handleWarnUser = (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticket?._id || !warnMessage.trim()) return
    userResolveMutation.mutate({
      ticketId: ticket._id,
      action: 'WARNING',
      escalationReason: warnMessage.trim(),
    })
  }

  const isPending =
    removePlanMutation.isPending ||
    closeMutation.isPending ||
    refundMutation.isPending ||
    userResolveMutation.isPending

  const isPlanReport = ticket?.type === 'REPORT_PLAN'

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Ticket actions"
      description={
        ticket
          ? `Resolve or close ticket ${ticket.title ? `"${ticket.title}"` : ticket._id}`
          : undefined
      }
      className="min-w-130 sm:max-w-2xl px-6 py-6 sm:px-8 sm:py-8"
    >
      <div>
        {!ticket ? (
          <p className="text-muted-foreground text-sm">No ticket selected.</p>
        ) : (
          <>
            <div className="mb-3 flex min-w-0 items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-2">
                <Avatar className="size-8 shrink-0">
                  <AvatarImage
                    src={ticket.reporter?.profileImage}
                    alt={getReporterName(ticket.reporter)}
                  />
                  <AvatarFallback className="border border-border bg-muted/50">
                    <UserIcon className="size-5 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <span className="truncate font-medium text-sm">
                  {getReporterName(ticket.reporter)}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <CalendarIcon className="size-3 text-muted-foreground" />
                <span className="text-muted-foreground text-xs">
                  {formatDateTime(ticket.createdAt)}
                </span>
              </div>
            </div>
            <Card className="mb-8">
              <CardContent>
                {ticket.title && (
                  <h4 className="text-base font-medium mb-2">{ticket.title}</h4>
                )}
                {ticket.description && (
                  <p className="text-muted-foreground text-sm">
                    {ticket.description}
                  </p>
                )}
                <Separator className="my-4" />
                {ticket.attachments?.length > 0 &&
                  ticket.attachments.map((attachment) => (
                    <a
                      key={attachment._id}
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm"
                    >
                      {attachment.filename}
                    </a>
                  ))}
              </CardContent>
            </Card>
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as ActionTab)}
              className="w-full min-h-70"
            >
              <TabsList className="bg-muted/50 grid w-full grid-cols-3 gap-1 p-1">
                {isPlanReport ? (
                  <>
                    <TabsTrigger
                      value="remove-plan"
                      className="gap-1.5 text-xs"
                    >
                      <BanIcon className="size-3.5" />
                      Remove Plan
                    </TabsTrigger>
                    <TabsTrigger value="close" className="gap-1.5 text-xs">
                      <CircleXIcon className="size-3.5" />
                      Close Ticket
                    </TabsTrigger>
                    <TabsTrigger
                      value="refund"
                      className="gap-1.5 text-xs"
                      disabled={true}
                    >
                      <ReceiptCentIcon className="size-3.5" />
                      Refund User
                    </TabsTrigger>
                  </>
                ) : (
                  <>
                    <TabsTrigger value="ban-user" className="gap-1.5 text-xs">
                      <BanIcon className="size-3.5" />
                      Ban User
                    </TabsTrigger>
                    <TabsTrigger value="warn-user" className="gap-1.5 text-xs">
                      <CircleXIcon className="size-3.5" />
                      Warn User
                    </TabsTrigger>
                    <TabsTrigger value="close" className="gap-1.5 text-xs">
                      <CircleXIcon className="size-3.5" />
                      Close Ticket
                    </TabsTrigger>
                  </>
                )}
              </TabsList>

              {isPlanReport ? (
                <>
                  <TabsContent
                    value="remove-plan"
                    className="mt-4 focus-visible:outline-none"
                  >
                    <form
                      onSubmit={handleRemovePlan}
                      className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-4"
                    >
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        Remove the reported plan and add a reason for the
                        removal.
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="remove-plan-message">
                          Why are you removing the plan?
                        </Label>
                        <Textarea
                          id="remove-plan-message"
                          placeholder="e.g. Violation of community guidelines..."
                          value={removePlanMessage}
                          onChange={(e) => setRemovePlanMessage(e.target.value)}
                          rows={4}
                          required
                          disabled={isPending}
                        />
                      </div>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={!removePlanMessage.trim() || isPending}
                      >
                        {removePlanMutation.isPending
                          ? 'Removing...'
                          : 'Remove plan'}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent
                    value="close"
                    className="mt-4 focus-visible:outline-none"
                  >
                    <form
                      onSubmit={handleCloseTicket}
                      className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-4"
                    >
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        Close this ticket without taking action on the plan.
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="close-message">
                          Why are you closing without action?
                        </Label>
                        <Textarea
                          id="close-message"
                          placeholder="e.g. Report was not valid..."
                          value={closeMessage}
                          onChange={(e) => setCloseMessage(e.target.value)}
                          rows={4}
                          required
                          disabled={isPending}
                        />
                      </div>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={!closeMessage.trim() || isPending}
                      >
                        {closeMutation.isPending
                          ? 'Closing...'
                          : 'Close ticket'}
                      </Button>
                    </form>
                  </TabsContent>

                  {/* <TabsContent
                    value="refund"
                    className="mt-4 focus-visible:outline-none"
                  >
                    <form
                      onSubmit={handleRefundReporter}
                      className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-4"
                    >
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        Refund the reporter and add a note for the resolution.
                      </p>
                      <div className="space-y-2">
                        <Label>Refund type</Label>
                        <Select
                          value={refundType}
                          onValueChange={(v) =>
                            setRefundType(v as 'Partial Refund' | 'Full Refund')
                          }
                          disabled={isPending}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select refund type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Partial Refund">
                              Partial refund
                            </SelectItem>
                            <SelectItem value="Full Refund">
                              Full refund
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="refund-amount">
                          Refund amount (required)
                        </Label>
                        <Input
                          id="refund-amount"
                          type="number"
                          min={0}
                          step={1}
                          placeholder="e.g. 500"
                          value={refundAmount}
                          onChange={(e) => setRefundAmount(e.target.value)}
                          disabled={isPending}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="refund-message">
                          Explain why (required)
                        </Label>
                        <Textarea
                          id="refund-message"
                          placeholder="e.g. Refunding due to plan cancellation..."
                          value={refundMessage}
                          onChange={(e) => setRefundMessage(e.target.value)}
                          rows={4}
                          required
                          disabled={isPending}
                        />
                      </div>
                      <Button
                        type="submit"
                        size="sm"
                        // disabled={
                        //   !refundMessage.trim() ||
                        //   isPending ||
                        //   !refundAmount.trim() ||
                        //   Number.isNaN(Number(refundAmount)) ||
                        //   Number(refundAmount) <= 0
                        // }
                        disabled={true}
                      >
                        {refundMutation.isPending
                          ? 'Submitting...'
                          : 'Refund reporter'}
                      </Button>
                    </form>
                  </TabsContent> */}
                </>
              ) : (
                <>
                  <TabsContent
                    value="ban-user"
                    className="mt-4 focus-visible:outline-none"
                  >
                    <form
                      onSubmit={handleBanUser}
                      className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-4"
                    >
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        Ban the user until a specific date and add a reason for
                        the ban.
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="ban-until">Ban until (deadline)</Label>
                        <Input
                          id="ban-until"
                          type="datetime-local"
                          value={banUntil}
                          onChange={(e) => setBanUntil(e.target.value)}
                          disabled={isPending}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ban-message">
                          Why are you banning the user?
                        </Label>
                        <Textarea
                          id="ban-message"
                          placeholder="e.g. Repeated violation of community guidelines..."
                          value={banMessage}
                          onChange={(e) => setBanMessage(e.target.value)}
                          rows={4}
                          required
                          disabled={isPending}
                        />
                      </div>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={!banUntil || !banMessage.trim() || isPending}
                      >
                        {userResolveMutation.isPending
                          ? 'Banning...'
                          : 'Ban user'}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent
                    value="warn-user"
                    className="mt-4 focus-visible:outline-none"
                  >
                    <form
                      onSubmit={handleWarnUser}
                      className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-4"
                    >
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        Send a warning to the user and explain why.
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="warn-message">
                          Why are you warning the user?
                        </Label>
                        <Textarea
                          id="warn-message"
                          placeholder="e.g. Violation of community guidelines..."
                          value={warnMessage}
                          onChange={(e) => setWarnMessage(e.target.value)}
                          rows={4}
                          required
                          disabled={isPending}
                        />
                      </div>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={!warnMessage.trim() || isPending}
                      >
                        {userResolveMutation.isPending
                          ? 'Sending warning...'
                          : 'Warn user'}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent
                    value="close"
                    className="mt-4 focus-visible:outline-none"
                  >
                    <form
                      onSubmit={handleCloseTicket}
                      className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-4"
                    >
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        Close this ticket without taking action on the user.
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="close-message">
                          Why are you closing without action?
                        </Label>
                        <Textarea
                          id="close-message"
                          placeholder="e.g. Report was not valid..."
                          value={closeMessage}
                          onChange={(e) => setCloseMessage(e.target.value)}
                          rows={4}
                          required
                          disabled={isPending}
                        />
                      </div>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={!closeMessage.trim() || isPending}
                      >
                        {closeMutation.isPending
                          ? 'Closing...'
                          : 'Close ticket'}
                      </Button>
                    </form>
                  </TabsContent>
                </>
              )}
            </Tabs>
          </>
        )}
      </div>
    </DetailSheet>
  )
}
