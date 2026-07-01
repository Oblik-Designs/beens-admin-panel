import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { ActivationSummary } from '@/components/engagement/activation-summary'
import { LifecycleFunnel } from '@/components/engagement/lifecycle-funnel'
import { AccountStatusBreakdown } from '@/components/engagement/account-status-breakdown'
import { ActivitySegments } from '@/components/engagement/activity-segments'
import { CohortFunnel } from '@/components/engagement/cohort-funnel'
import { NeverActivatedTable } from '@/components/engagement/never-activated-table'
import type { CohortWindow } from '@/server/api/admin'
import { getProfileOptions } from '@/queries/users'
import {
  cohortFunnelOptions,
  getActivitySegmentsOptions,
  getAdminStatsOptions,
  getEngagementFunnelOptions,
} from '@/queries/admin'
import {
  buildFunnelStages,
  buildStatusBreakdown,
  deriveActivation,
} from '@/lib/engagement-funnel'
import { buildActivitySegments } from '@/lib/activity-segments'
import { buildCohortRows } from '@/lib/cohort-funnel'

const NEVER_ACTIVATED_ID = 'never-activated'

export const Route = createFileRoute('/(app)/engagement')({
  loader: async ({ context }) => {
    // Profile is the auth check (awaited); stats are warmed in the background
    // so a slow/missing endpoint degrades to empty cards instead of blocking
    // the route — same resilience pattern as the Dashboard.
    await context.queryClient.ensureQueryData(getProfileOptions)
    void context.queryClient.prefetchQuery(getAdminStatsOptions)
    void context.queryClient.prefetchQuery(getEngagementFunnelOptions)
    void context.queryClient.prefetchQuery(getActivitySegmentsOptions)
    void context.queryClient.prefetchQuery(cohortFunnelOptions('30'))
  },
  component: EngagementPage,
})

function EngagementPage() {
  const [cohortWindow, setCohortWindow] = React.useState<CohortWindow>('30')

  const { data: statsResponse } = useQuery(getAdminStatsOptions)
  const { data: funnelResponse } = useQuery(getEngagementFunnelOptions)
  const { data: segmentsResponse } = useQuery(getActivitySegmentsOptions)
  const { data: cohortResponse } = useQuery(cohortFunnelOptions(cohortWindow))
  const users = statsResponse?.data?.users ?? {}
  const behavior = funnelResponse?.data ?? null
  const segments = segmentsResponse?.data ?? null

  const activation = React.useMemo(() => deriveActivation(users), [users])
  const stages = React.useMemo(
    () => buildFunnelStages(activation, behavior),
    [activation, behavior],
  )
  const statusBreakdown = React.useMemo(
    () => buildStatusBreakdown(users),
    [users],
  )
  const segmentRows = React.useMemo(
    () => buildActivitySegments(segments),
    [segments],
  )
  const cohortRows = React.useMemo(
    () => buildCohortRows(cohortResponse?.data?.cohorts),
    [cohortResponse],
  )
  const cohortWindowDays = cohortResponse?.data?.windowDays ?? 30

  const scrollToFollowUp = React.useCallback(() => {
    document
      .getElementById(NEVER_ACTIVATED_ID)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Engagement" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-6 p-4">
            <ActivationSummary
              snapshot={activation}
              onFollowUp={scrollToFollowUp}
            />

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <LifecycleFunnel
                  stages={stages}
                  total={activation.totalUsers}
                />
              </div>
              <AccountStatusBreakdown rows={statusBreakdown} />
            </div>

            <ActivitySegments
              rows={segmentRows}
              total={segments?.total ?? 0}
            />

            <CohortFunnel
              rows={cohortRows}
              windowDays={cohortWindowDays}
              window={cohortWindow}
              onWindowChange={setCohortWindow}
            />

            <NeverActivatedTable id={NEVER_ACTIVATED_ID} />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
