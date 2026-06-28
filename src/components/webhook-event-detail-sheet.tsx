import * as React from 'react'
import { useQuery } from '@tanstack/react-query'

import type { WebhookEventPayload } from '@/types/crisis'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { webhookEventPayloadOptions } from '@/queries/webhook-events'

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right font-mono text-xs break-all">{value}</span>
    </div>
  )
}

function JsonBlock({ value }: { value: unknown }) {
  const text = React.useMemo(() => {
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return String(value)
    }
  }, [value])
  return (
    <pre className="max-h-[40vh] overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all">
      {text}
    </pre>
  )
}

export function WebhookEventDetailSheet({
  eventId,
  onOpenChange,
}: {
  eventId: string | null
  onOpenChange: (open: boolean) => void
}) {
  const { data, isLoading, isError, error } = useQuery(
    webhookEventPayloadOptions(eventId),
  )
  const detail = (data as { data?: WebhookEventPayload } | undefined)?.data

  return (
    <Sheet open={!!eventId} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto sm:max-w-2xl"
      >
        <SheetHeader>
          <SheetTitle>Webhook payload</SheetTitle>
          <SheetDescription>
            Raw provider payload as received. Viewing is restricted to
            SUPERADMIN and is recorded in the admin audit log.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-4 pb-8">
          {isLoading && (
            <div className="space-y-2 pt-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-40 w-full" />
            </div>
          )}

          {isError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {(error)?.message ??
                'Failed to load payload. This view requires SUPERADMIN.'}
            </div>
          )}

          {detail && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{detail.provider}</Badge>
                <Badge
                  variant={
                    detail.verification.status === 'PASSED'
                      ? 'default'
                      : detail.verification.status === 'FAILED'
                        ? 'destructive'
                        : 'secondary'
                  }
                >
                  verify: {detail.verification.status}
                </Badge>
                <Badge
                  variant={
                    detail.processing.status === 'ERROR'
                      ? 'destructive'
                      : detail.processing.status === 'PROCESSED'
                        ? 'default'
                        : 'secondary'
                  }
                >
                  {detail.processing.status}
                </Badge>
              </div>

              <div className="rounded-md border p-3">
                <Row label="Event" value={detail.eventName ?? '—'} />
                <Row label="Route" value={detail.route} />
                <Row
                  label="Received"
                  value={new Date(detail.receivedAt).toLocaleString()}
                />
                <Row label="Environment" value={detail.environment ?? '—'} />
                <Row label="Reference id" value={detail.referenceId ?? '—'} />
                <Row
                  label="Verification method"
                  value={detail.verification.method}
                />
                {detail.verification.detail ? (
                  <Row label="Verification detail" value={detail.verification.detail} />
                ) : null}
                {detail.processing.skipReason ? (
                  <Row label="Skip reason" value={detail.processing.skipReason} />
                ) : null}
                {detail.processing.errorMessage ? (
                  <Row label="Error" value={detail.processing.errorMessage} />
                ) : null}
                <Row
                  label="Linked transaction"
                  value={detail.linkedTransactionId ?? '—'}
                />
                <Row label="Linked user" value={detail.linkedUserId ?? '—'} />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Payload
                </span>
                <JsonBlock value={detail.payload} />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Headers
                </span>
                <JsonBlock value={detail.headers} />
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
