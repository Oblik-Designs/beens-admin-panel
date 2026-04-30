import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getProfileOptions } from '@/queries/users'
import {
  getAdminStatsOptions,
  plansTimeseriesOptions,
  transactionsTimeseriesOptions,
} from '@/queries/admin'

const OPEN_TICKET_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'ESCALATED',
  'AWAITING_USER_RESPONSE',
] as const

const sumCounts = (
  source: Record<string, number | undefined> | undefined,
  keys?: ReadonlyArray<string>,
) => {
  if (!source) return 0
  const target = keys ?? Object.keys(source)
  return target.reduce((acc, key) => acc + (source[key] ?? 0), 0)
}

const formatNumber = (value: number) => value.toLocaleString()

const formatDateLabel = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

type RangeValue = '3m' | '30d' | '7d'

const RANGE_LABEL: Record<RangeValue, string> = {
  '3m': 'last 3 months',
  '30d': 'last 30 days',
  '7d': 'last 7 days',
}

export const Route = createFileRoute('/(app)/')({
  loader: async ({ context }) => {
    // Profile is the only required call (auth check). Stats and timeseries
    // are warmed in the background — if the backend is missing endpoints or
    // returns an error, the route still loads and components show their own
    // empty/loading states instead of crashing the whole dashboard.
    await context.queryClient.ensureQueryData(getProfileOptions)
    void context.queryClient.prefetchQuery(getAdminStatsOptions)
    void context.queryClient.prefetchQuery(plansTimeseriesOptions('3m'))
    void context.queryClient.prefetchQuery(transactionsTimeseriesOptions('3m'))
  },
  component: App,
})

function App() {
  const [plansRange, setPlansRange] = React.useState<RangeValue>('3m')
  const [transactionsRange, setTransactionsRange] =
    React.useState<RangeValue>('3m')

  const { data: statsResponse } = useQuery(getAdminStatsOptions)
  console.log('statsResponse is: ', statsResponse)
  const stats = statsResponse?.data

  const totalUsers = sumCounts(stats?.users)
  const openTickets = sumCounts(stats?.tickets, OPEN_TICKET_STATUSES)
  const unassignedTickets = stats?.tickets?.unassigned ?? 0
  const activeDisputes = stats?.disputes?.active ?? 0
  const frozenEscrowEntries = Object.entries(
    stats?.disputes?.frozenEscrow ?? {},
  )

  const revenueByCurrency = stats?.totalRevenue ?? {}
  const primaryCurrency =
    'THB' in revenueByCurrency
      ? 'THB'
      : (Object.keys(revenueByCurrency)[0] ?? null)
  const primaryRevenue = primaryCurrency
    ? (revenueByCurrency[primaryCurrency] ?? 0)
    : 0
  const otherRevenueEntries = Object.entries(revenueByCurrency).filter(
    ([currency]) => currency !== primaryCurrency,
  )

  const { data: plansSeriesResponse } = useQuery(
    plansTimeseriesOptions(plansRange),
  )
  const plansData = plansSeriesResponse?.data?.buckets ?? []

  const { data: transactionsSeriesResponse } = useQuery(
    transactionsTimeseriesOptions(transactionsRange),
  )
  const transactionsData = transactionsSeriesResponse?.data?.buckets ?? []

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
        <SiteHeader title="Dashboard" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2 p-4">
            {/* Top 4 cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card size="sm">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    Total Users
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-2xl font-semibold tracking-tight">
                    {formatNumber(totalUsers)}
                  </p>
                  <CardDescription>
                    Across all account statuses.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card size="sm">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    Open Tickets
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-2xl font-semibold tracking-tight">
                    {formatNumber(openTickets)}
                  </p>
                  <CardDescription>
                    {unassignedTickets > 0
                      ? `${formatNumber(unassignedTickets)} unassigned`
                      : 'Awaiting moderator action.'}
                  </CardDescription>
                </CardContent>
              </Card>

              <Card size="sm">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    Active Disputes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-2xl font-semibold tracking-tight">
                    {formatNumber(activeDisputes)}
                  </p>
                  <CardDescription>
                    {frozenEscrowEntries.length > 0
                      ? `Frozen escrow: ${frozenEscrowEntries
                          .map(
                            ([currency, amount]) =>
                              `${currency} ${formatNumber(amount)}`,
                          )
                          .join(', ')}`
                      : 'Financial disputes in progress.'}
                  </CardDescription>
                </CardContent>
              </Card>

              <Card size="sm">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    Total Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-2xl font-semibold tracking-tight">
                    {primaryCurrency
                      ? `${`฿`} ${formatNumber(primaryRevenue)}`
                      : '—'}
                  </p>
                  <CardDescription>
                    {otherRevenueEntries.length > 0
                      ? `+ ${otherRevenueEntries
                          .map(
                            ([currency, amount]) =>
                              `${currency} ${formatNumber(amount)}`,
                          )
                          .join(', ')}`
                      : 'Platform fees from completed transactions.'}
                  </CardDescription>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 space-y-6">
              {/* Plans Created per day */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <div>
                    <CardTitle>Plans Created per day</CardTitle>
                    <CardDescription>
                      Total plans created over the {RANGE_LABEL[plansRange]}.
                    </CardDescription>
                  </div>
                  <Tabs
                    value={plansRange}
                    onValueChange={(value) =>
                      setPlansRange(value as RangeValue)
                    }
                    className="w-auto"
                  >
                    <TabsList className="rounded-full px-2 py-1.5 text-xs font-medium">
                      <TabsTrigger value="3m">Last 3 months</TabsTrigger>
                      <TabsTrigger value="30d">Last 30 days</TabsTrigger>
                      <TabsTrigger value="7d">Last 7 days</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={plansData}
                      margin={{ left: -16, right: 0, top: 16, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="plansCount"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="var(--chart-1)"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="var(--chart-1)"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        className="stroke-border"
                      />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={formatDateLabel}
                        className="text-xs text-muted-foreground"
                      />
                      <Tooltip
                        labelFormatter={formatDateLabel}
                        contentStyle={{
                          borderRadius: 12,
                          borderColor: 'var(--chart-4)',
                          backgroundColor: 'var(--chart-5)',
                          color: 'var(--chart-1)',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        name="Plans"
                        stroke="var(--chart-1)"
                        strokeWidth={2}
                        fill="url(#plansCount)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Transactions per day */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <div>
                    <CardTitle>Transactions per day</CardTitle>
                    <CardDescription>
                      Total transactions processed over the{' '}
                      {RANGE_LABEL[transactionsRange]}.
                    </CardDescription>
                  </div>
                  <Tabs
                    value={transactionsRange}
                    onValueChange={(value) =>
                      setTransactionsRange(value as RangeValue)
                    }
                    className="w-auto"
                  >
                    <TabsList className="rounded-full px-2 py-1.5 text-xs font-medium">
                      <TabsTrigger value="3m">Last 3 months</TabsTrigger>
                      <TabsTrigger value="30d">Last 30 days</TabsTrigger>
                      <TabsTrigger value="7d">Last 7 days</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardHeader>
                <CardContent className="h-72 mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={transactionsData}
                      margin={{ left: -16, right: 0, top: 16, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="transactionsArea"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="var(--chart-3)"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="var(--chart-3)"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        className="stroke-border"
                      />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={formatDateLabel}
                        className="text-xs text-muted-foreground"
                      />
                      <Tooltip
                        labelFormatter={formatDateLabel}
                        contentStyle={{
                          borderRadius: 12,
                          borderColor: 'var(--chart-4)',
                          backgroundColor: 'var(--chart-5)',
                          color: 'var(--chart-1)',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="amount"
                        name="Revenue (THB)"
                        stroke="var(--chart-3)"
                        strokeWidth={2}
                        fill="url(#transactionsArea)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
