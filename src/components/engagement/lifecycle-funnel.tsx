import { ArrowDownIcon } from 'lucide-react'
import type { FunnelStage } from '@/lib/engagement-funnel'
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

// A stable colour per known stage, walking the theme's chart ramp.
const STAGE_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

export interface LifecycleFunnelProps {
  stages: Array<FunnelStage>
  total: number
}

/**
 * Vertical funnel: each stage is a proportional bar (width = reached / total),
 * with a drop-off callout between two consecutive measured stages. Stages
 * without data yet render as a dashed "awaiting instrumentation" track rather
 * than a misleading zero.
 */
export function LifecycleFunnel({ stages, total }: LifecycleFunnelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lifecycle Funnel</CardTitle>
        <CardDescription>
          Where accounts drop off on the way to being retained. Created →
          Activated is live; deeper stages arrive as instrumentation lands
          (Phases 2–3).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {stages.map((stage, i) => {
          const pending = stage.count === null
          const widthPct =
            pending || total === 0
              ? 0
              : Math.max(2, Math.round((stage.count! / total) * 100))

          // Drop-off from the previous stage, only when both are measured.
          const prev = stages[i - 1]
          const showDrop =
            prev != null && prev.count !== null && stage.count !== null
          const dropped = showDrop ? prev.count! - stage.count! : 0
          const dropPct =
            showDrop && prev.count! > 0 ? dropped / prev.count! : 0

          return (
            <div key={stage.key}>
              {showDrop && dropped > 0 ? (
                <div className="text-muted-foreground flex items-center gap-1.5 py-1.5 pl-9 text-xs">
                  <ArrowDownIcon className="size-3.5 text-amber-500" />
                  <span>
                    <span className="text-amber-600 dark:text-amber-500">
                      {formatNumber(dropped)} dropped
                    </span>{' '}
                    ({formatPercent(dropPct)})
                  </span>
                </div>
              ) : null}

              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                    pending
                      ? 'bg-muted text-muted-foreground'
                      : 'text-primary-foreground',
                  )}
                  style={
                    pending
                      ? undefined
                      : {
                          backgroundColor:
                            STAGE_COLORS[i % STAGE_COLORS.length],
                        }
                  }
                >
                  {i + 1}
                </span>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium">{stage.label}</span>
                      <span className="text-muted-foreground truncate text-xs">
                        {stage.description}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      {stage.conversionFromPrev !== null ? (
                        <span className="text-muted-foreground text-xs tabular-nums">
                          {formatPercent(stage.conversionFromPrev)} of created
                        </span>
                      ) : null}
                      {pending ? (
                        <Badge variant="outline">
                          Awaiting instrumentation
                        </Badge>
                      ) : (
                        <span className="font-semibold tabular-nums">
                          {formatNumber(stage.count!)}
                        </span>
                      )}
                    </div>
                  </div>

                  {pending ? (
                    <div className="border-muted-foreground/25 h-2.5 w-full rounded border border-dashed" />
                  ) : (
                    <div className="bg-muted h-2.5 w-full overflow-hidden rounded">
                      <div
                        className="h-full rounded transition-all"
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor:
                            STAGE_COLORS[i % STAGE_COLORS.length],
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
