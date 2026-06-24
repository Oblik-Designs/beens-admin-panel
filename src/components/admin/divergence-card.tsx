import { AlertTriangleIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Plain-language summary of "what the DB says" vs. "what the provider says"
 * for a single entity. Drives operator decisions on whether to replay,
 * reconcile, or force a status change.
 *
 * Lives in the Remediation column of every 360 page (User / Plan /
 * Transaction). Hidden when there is no divergence.
 *
 * Reference: admin-crisis-implementation-plan.md §7.2 (preview/apply flow)
 * and design plan §7.2 (action hierarchy).
 */
export interface DivergenceCardProps {
    /** What the DB shows now (e.g. "PROCESSING (12 min)"). */
    dbValue: string
    /** What the provider authoritatively reports (e.g. "SUCCEEDED"). */
    providerValue: string
    /** Standardised cause from the webhook skipReason taxonomy, or null. */
    cause: string | null
    /** Friendly label for the source-of-truth provider, default "Xendit". */
    providerLabel?: string
    className?: string
}

/**
 * Pretty-prints a skip reason as a plain-language clause. The full
 * decision table lives in `lib/crisis-copy.ts`; this is just the short
 * tail-end for the inline cause readout.
 */
function describeCause(cause: string | null): string {
    if (!cause) return ''
    const map: Record<string, string> = {
        token_mismatch: 'webhook signature did not match',
        signature_mismatch: 'webhook signature did not match',
        txn_not_found: "we couldn't find the transaction",
        user_not_found: "we couldn't find the user",
        applicant_mismatch: 'the Sumsub applicant did not match our record',
        unhandled_event: 'the event type is not handled by our system',
        missing_event_or_data: 'required webhook fields were missing',
        missing_reference: 'no reference id was provided',
        already_terminal: 'the record had already moved on',
        delivery_failed: 'message delivery failed',
        undeliverable: 'the recipient could not be reached',
    }
    return map[cause] ?? cause.replaceAll('_', ' ')
}

export function DivergenceCard({
    dbValue,
    providerValue,
    cause,
    providerLabel = 'Xendit',
    className,
}: DivergenceCardProps) {
    return (
        <div
            className={cn(
                'space-y-2 rounded-lg border border-amber-300 bg-amber-50/60 px-4 py-3 text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-100',
                className,
            )}
            role="status"
            aria-live="polite"
        >
            <div className="flex items-center gap-2">
                <AlertTriangleIcon className="size-3" aria-hidden="true" />
                <span className="text-xs uppercase tracking-wide">
                    Divergence detected
                </span>
            </div>

            <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between gap-4">
                    <span className="text-amber-900/70 dark:text-amber-100/70">DB</span>
                    <span className="font-mono">{dbValue}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <span className="text-amber-900/70 dark:text-amber-100/70">
                        {providerLabel}
                    </span>
                    <span className="font-mono">{providerValue}</span>
                </div>
            </div>

            {cause && (
                <p className="text-xs leading-relaxed">
                    Cause: <span className="font-medium">{describeCause(cause)}</span>
                </p>
            )}
        </div>
    )
}
