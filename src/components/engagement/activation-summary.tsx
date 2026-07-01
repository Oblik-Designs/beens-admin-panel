import {
  CheckCircle2Icon,
  GaugeIcon,
  UserPlusIcon,
  UserXIcon,
} from 'lucide-react'
import { EngagementMetricCard } from './engagement-metric-card'
import type { ActivationSnapshot } from '@/lib/engagement-funnel'

const formatNumber = (value: number) => value.toLocaleString()
const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`

export interface ActivationSummaryProps {
  snapshot: ActivationSnapshot
  /** Jump to the Never Activated follow-up list. */
  onFollowUp?: () => void
}

/** The four headline KPIs for the Created → Activated arrow. */
export function ActivationSummary({
  snapshot,
  onFollowUp,
}: ActivationSummaryProps) {
  const { totalUsers, activatedUsers, notActivatedUsers, activationRate } =
    snapshot
  const hasUsers = totalUsers > 0

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <EngagementMetricCard
        label="Accounts Created"
        value={formatNumber(totalUsers)}
        hint="Across all account statuses"
        icon={UserPlusIcon}
        tone="primary"
      />
      <EngagementMetricCard
        label="Activated"
        value={formatNumber(activatedUsers)}
        hint="Finished signup"
        icon={CheckCircle2Icon}
        tone="positive"
      />
      <EngagementMetricCard
        label="Activation Rate"
        value={hasUsers ? formatPercent(activationRate) : '—'}
        hint="Created → Activated conversion"
        icon={GaugeIcon}
        tone="default"
      />
      <EngagementMetricCard
        label="Never Activated"
        value={formatNumber(notActivatedUsers)}
        hint={onFollowUp ? 'Tap to follow up →' : 'Signed up, never finished'}
        icon={UserXIcon}
        tone="warning"
        onClick={onFollowUp}
      />
    </div>
  )
}
