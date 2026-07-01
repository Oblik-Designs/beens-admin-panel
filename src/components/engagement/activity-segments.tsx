import type {
  ActivitySegmentRow,
  ActivitySegmentTone,
} from '@/lib/activity-segments'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const formatNumber = (value: number) => value.toLocaleString()
const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`

// Dot colour per segment tone — a decay ramp from active (green) to
// disengaged (zinc), matching the retention story the row tells.
const TONE_DOT: Record<ActivitySegmentTone, string> = {
  positive: 'bg-emerald-500',
  primary: 'bg-primary',
  default: 'bg-sky-500',
  warning: 'bg-amber-500',
  muted: 'bg-zinc-400',
}

export interface ActivitySegmentsProps {
  rows: Array<ActivitySegmentRow>
  total: number
}

/**
 * The retention lens (§6): every account bucketed by how recently it was
 * last active. The measured buckets are mutually exclusive and sum to the
 * user base; "Very active" stays a dashed placeholder until per-day login
 * history is instrumented (Phase 6).
 */
export function ActivitySegments({ rows, total }: ActivitySegmentsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Segments</CardTitle>
        <CardDescription>
          {total > 0
            ? `Every account by last-login recency — mutually exclusive, summing to ${formatNumber(total)} users.`
            : 'Every account by last-login recency — mutually exclusive buckets.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => {
          const pending = row.count === null
          return (
            <div
              key={row.key}
              className={cn(
                'rounded-lg border p-3.5',
                pending && 'border-dashed',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span
                    className={cn(
                      'size-2 rounded-full',
                      pending ? 'bg-muted-foreground/40' : TONE_DOT[row.tone],
                    )}
                  />
                  {row.label}
                </span>
                {pending ? (
                  <Badge variant="outline" className="text-[10px]">
                    Awaiting instrumentation
                  </Badge>
                ) : row.share !== null ? (
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {formatPercent(row.share)}
                  </span>
                ) : null}
              </div>
              <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">
                {pending ? '—' : formatNumber(row.count!)}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {row.description}
              </p>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
