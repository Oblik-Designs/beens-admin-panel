import type { CSSProperties } from 'react'
import type { CohortRow } from '@/lib/cohort-funnel'
import type { CohortWindow } from '@/server/api/admin'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const formatNumber = (value: number) => value.toLocaleString()
const formatPercent = (value: number | null) =>
  value === null ? '—' : `${(value * 100).toFixed(0)}%`

// "2026-06-01" → "Jun 1" (the Monday the cohort week starts on).
const formatWeekLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })

// Subtle heatmap: a light emerald wash whose alpha tracks the reach rate, so
// the decay down each column is visible at a glance.
const heatStyle = (rate: number | null): CSSProperties | undefined =>
  rate === null || rate <= 0
    ? undefined
    : { backgroundColor: `rgba(16, 185, 129, ${Math.min(0.85, rate) * 0.4})` }

const WINDOW_OPTIONS: Array<CohortWindow> = ['7', '14', '30']

export interface CohortFunnelProps {
  rows: Array<CohortRow>
  windowDays: number
  window: CohortWindow
  onWindowChange: (window: CohortWindow) => void
}

interface StageCellProps {
  count: number
  rate: number | null
  muted: boolean
}

function StageCell({ count, rate, muted }: StageCellProps) {
  return (
    <td className="px-3 py-2 text-right">
      <div
        className="rounded px-2 py-1"
        style={muted ? undefined : heatStyle(rate)}
      >
        <span className="font-medium tabular-nums">{formatPercent(rate)}</span>{' '}
        <span className="text-muted-foreground text-xs tabular-nums">
          ({formatNumber(count)})
        </span>
      </div>
    </td>
  )
}

/**
 * The age-controlled drop-off diagnostic (§7 view 2): each signup-week cohort
 * as a row, showing the share that reached each stage within N days of signup.
 * Reading *down* a column shows how the reach rate holds across cohorts;
 * reading *across* a row shows one cohort's funnel. Cohorts still inside the
 * N-day window are flagged "maturing" and dimmed so they aren't misread as a
 * leak.
 */
export function CohortFunnel({
  rows,
  windowDays,
  window,
  onWindowChange,
}: CohortFunnelProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Cohort Funnel</CardTitle>
          <CardDescription>
            Share of each signup week that reached a stage within {windowDays}{' '}
            days of signup — controls for account age.
          </CardDescription>
        </div>
        <Tabs
          value={window}
          onValueChange={(value) => onWindowChange(value as CohortWindow)}
          className="w-auto"
        >
          <TabsList className="rounded-full px-2 py-1.5 text-xs font-medium">
            {WINDOW_OPTIONS.map((w) => (
              <TabsTrigger key={w} value={w}>
                {w}d
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">No cohort data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-xs">
                  <th className="px-3 py-2 text-left font-medium">
                    Signup week
                  </th>
                  <th className="px-3 py-2 text-right font-medium">Signups</th>
                  <th className="px-3 py-2 text-right font-medium">Activated</th>
                  <th className="px-3 py-2 text-right font-medium">
                    Initiating
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    Connecting
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const muted = !row.complete
                  return (
                    <tr
                      key={row.cohortWeek}
                      className={cn(
                        'border-b last:border-0',
                        muted && 'opacity-60',
                      )}
                    >
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="flex items-center gap-2">
                          <span className="font-medium">
                            {formatWeekLabel(row.cohortWeek)}
                          </span>
                          {muted ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-normal"
                            >
                              maturing
                            </Badge>
                          ) : null}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">
                        {formatNumber(row.created)}
                      </td>
                      <StageCell
                        count={row.activated}
                        rate={row.activatedRate}
                        muted={muted}
                      />
                      <StageCell
                        count={row.initiating}
                        rate={row.initiatingRate}
                        muted={muted}
                      />
                      <StageCell
                        count={row.connecting}
                        rate={row.connectingRate}
                        muted={muted}
                      />
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
