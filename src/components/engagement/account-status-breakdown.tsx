import type { StatusBreakdownRow } from '@/lib/engagement-funnel'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

const formatNumber = (value: number) => value.toLocaleString()
const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`

// Dot + bar colour per account status. Falls back to the primary colour for
// any status the API adds later that we haven't themed yet.
const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'bg-emerald-500',
  UNVERIFIED: 'bg-amber-500',
  INCOMPLETE: 'bg-orange-500',
  ESCALATED: 'bg-red-500',
  DISABLED: 'bg-zinc-400',
  PENDING_DELETE: 'bg-rose-400',
}

export interface AccountStatusBreakdownProps {
  rows: Array<StatusBreakdownRow>
}

/** Supporting view: every account bucketed by status, biggest first. */
export function AccountStatusBreakdown({ rows }: AccountStatusBreakdownProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Status</CardTitle>
        <CardDescription>Every account bucketed by status.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3.5">
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">No account data yet.</p>
        ) : (
          rows.map((row) => {
            const color = STATUS_COLOR[row.status] ?? 'bg-primary'
            return (
              <div key={row.status} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <span className={cn('size-2 rounded-full', color)} />
                    {row.label}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {formatNumber(row.count)} · {formatPercent(row.share)}
                  </span>
                </div>
                <div className="bg-muted h-2 w-full overflow-hidden rounded">
                  <div
                    className={cn('h-full rounded', color)}
                    style={{
                      width: `${Math.max(2, Math.round(row.share * 100))}%`,
                    }}
                  />
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
