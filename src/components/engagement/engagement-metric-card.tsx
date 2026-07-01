import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type MetricTone = 'default' | 'primary' | 'positive' | 'warning'

const TONE_ICON: Record<MetricTone, string> = {
  default: 'bg-muted text-foreground',
  primary: 'bg-primary/10 text-primary',
  positive: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-500',
}

export interface EngagementMetricCardProps {
  label: string
  value: string
  hint?: string
  icon: LucideIcon
  tone?: MetricTone
  /** When set, the card becomes a button (e.g. jump to a follow-up list). */
  onClick?: () => void
}

/**
 * A single KPI tile: tinted icon chip + big value + hint. Kept dumb — all
 * numbers are computed by the caller so the card stays reusable.
 */
export function EngagementMetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  onClick,
}: EngagementMetricCardProps) {
  const interactive = Boolean(onClick)
  return (
    <Card
      size="sm"
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
      className={cn(
        'transition-colors',
        interactive &&
          'hover:bg-muted/40 focus-visible:ring-ring cursor-pointer focus-visible:ring-2 focus-visible:outline-none',
      )}
    >
      <CardContent className="flex items-start gap-3">
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg',
            TONE_ICON[tone],
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 space-y-0.5">
          <p className="text-muted-foreground text-xs font-medium">{label}</p>
          <p className="text-2xl leading-tight font-semibold tracking-tight tabular-nums">
            {value}
          </p>
          {hint ? (
            <p className="text-muted-foreground text-xs">{hint}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
