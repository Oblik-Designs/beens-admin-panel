'use client'

import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { DetailSheet } from '@/components/detail-sheet'
import { Button } from '@/components/ui/button'
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
} from '@/queries/tickets'
import type { Ticket } from '@/server/api/tickets'
import { BanIcon, CircleXIcon, ReceiptCentIcon } from 'lucide-react'

type TicketActionSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticket: Ticket | null
}

type ActionTab = 'remove-plan' | 'close' | 'refund'

export function TicketActionSheet({
  open,
  onOpenChange,
  ticket,
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
    },
  })

  const handleRemovePlan = (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticket?._id || !removePlanMessage.trim()) return
    removePlanMutation.mutate({
      ticketId: ticket._id,
      action: 'SUSPENSION',
      description: removePlanMessage.trim(),
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
    const isPartial = refundType === 'Partial Refund'
    const amount = Number(refundAmount.trim())
    if (isPartial) {
      if (Number.isNaN(amount) || amount <= 0) return
      refundMutation.mutate({
        ticketId: ticket._id,
        action: 'PARTIAL_REFUND',
        description: refundMessage.trim(),
        refundAmount: amount,
      })
    } else {
      refundMutation.mutate({
        ticketId: ticket._id,
        action: 'REFUND',
        description: refundMessage.trim(),
        refundAmount: amount,
      })
    }
  }

  const isPending =
    removePlanMutation.isPending ||
    closeMutation.isPending ||
    refundMutation.isPending

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
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as ActionTab)}
            className="w-full min-h-70"
          >
            <TabsList className="bg-muted/50 grid w-full grid-cols-3 gap-1 p-1">
              <TabsTrigger value="remove-plan" className="gap-1.5 text-xs">
                <BanIcon className="size-3.5" />
                Remove Plan
              </TabsTrigger>
              <TabsTrigger value="close" className="gap-1.5 text-xs">
                <CircleXIcon className="size-3.5" />
                Close
              </TabsTrigger>
              <TabsTrigger value="refund" className="gap-1.5 text-xs">
                <ReceiptCentIcon className="size-3.5" />
                Refund
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="remove-plan"
              className="mt-4 focus-visible:outline-none"
            >
              <form
                onSubmit={handleRemovePlan}
                className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-4"
              >
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Remove the reported plan and add a reason for the removal.
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
                  {removePlanMutation.isPending ? 'Removing...' : 'Remove plan'}
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
                  {closeMutation.isPending ? 'Closing...' : 'Close ticket'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent
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
                      <SelectItem value="Full Refund">Full refund</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {refundType === 'Partial Refund' && (
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
                )}
                <div className="space-y-2">
                  <Label htmlFor="refund-message">Explain why (required)</Label>
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
                  disabled={
                    !refundMessage.trim() ||
                    isPending ||
                    (refundType === 'Partial Refund' &&
                      (!refundAmount.trim() ||
                        Number.isNaN(Number(refundAmount)) ||
                        Number(refundAmount) <= 0))
                  }
                >
                  {refundMutation.isPending
                    ? 'Submitting...'
                    : 'Refund reporter'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DetailSheet>
  )
}
