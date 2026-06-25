import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import { Entity360Shell } from '@/components/admin/entity-360-shell'
import { RemediationPanel } from '@/components/admin/remediation-panel'
import { Timeline } from '@/components/admin/timeline'
import {
    applyRemediationAction,
    previewRemediationAction,
    remediationContextOptions,
    transactionTimelineOptions,
} from '@/queries/crisis'

/**
 * Transaction 360 — Phase 3 / L1 of the Crisis Console.
 *
 * Status flow + splits + linked webhook events. Raw
 * `gateway.gatewayResponse` is gated to SUPERADMIN and writes an audit
 * row when revealed (Phase 5 behavior; the gate UI lands here for visual
 * completeness). No `/admin/transactions/:id` helper exists in the
 * admin-panel client yet — once it lands, swap the placeholder summary
 * for a `Transaction` + `Overview` box pair matching the User/Plan 360s.
 */

export const Route = createFileRoute('/(app)/transactions/$transactionId')({
    component: TransactionDetailPage,
})

function TransactionDetailPage() {
    const { transactionId } = Route.useParams()

    const { data: timelineRes, isLoading: timelineLoading } = useQuery(
        transactionTimelineOptions(transactionId),
    )
    const { data: remediationRes } = useQuery(
        remediationContextOptions('Transaction', transactionId),
    )

    const timelineEvents = timelineRes?.data ?? []
    const remediationContext = remediationRes?.data

    const actorRole = 'MANAGER' as const

    return (
        <Entity360Shell
            title="Transaction"
            subtitle={transactionId}
            summary={
                <div className="space-y-2 rounded-lg border bg-muted/40 px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        Transaction
                    </div>
                    <div className="space-y-0.5">
                        <code className="block truncate text-[11px] text-muted-foreground">
                            {transactionId}
                        </code>
                        <p className="text-sm">
                            Status flow, splits, and linked webhook events. Raw
                            provider payload is SUPERADMIN-only and audited on
                            reveal.
                        </p>
                    </div>
                </div>
            }
            timeline={
                timelineLoading ? (
                    <div className="h-full animate-pulse rounded-lg border bg-muted/40" />
                ) : (
                    <Timeline events={timelineEvents} />
                )
            }
            sidebar={
                remediationContext ? (
                    <RemediationPanel
                        context={remediationContext}
                        actorRole={actorRole}
                        onPreview={(action) =>
                            previewRemediationAction(action, remediationContext)
                        }
                        onApply={async (action, reason) => {
                            const res = await applyRemediationAction(
                                action,
                                reason,
                                remediationContext,
                            )
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
