import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
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
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts'

type RangeValue = '3m' | '30d' | '7d'

const RANGE_LABEL: Record<RangeValue, string> = {
  '3m': 'last 3 months',
  '30d': 'last 30 days',
  '7d': 'last 7 days',
}

const plansPerDayData = [
  { date: 'Apr 7', mobile: 120, desktop: 80 },
  { date: 'Apr 13', mobile: 260, desktop: 190 },
  { date: 'Apr 19', mobile: 210, desktop: 160 },
  { date: 'Apr 26', mobile: 320, desktop: 240 },
  { date: 'May 2', mobile: 280, desktop: 230 },
  { date: 'May 8', mobile: 340, desktop: 260 },
  { date: 'May 14', mobile: 300, desktop: 240 },
  { date: 'May 21', mobile: 360, desktop: 270 },
  { date: 'May 28', mobile: 310, desktop: 250 },
  { date: 'Jun 3', mobile: 370, desktop: 280 },
]

const transactionsPerDayData = [
  { date: 'Apr 7', amount: 320 },
  { date: 'Apr 13', amount: 540 },
  { date: 'Apr 19', amount: 430 },
  { date: 'Apr 26', amount: 610 },
  { date: 'May 2', amount: 580 },
  { date: 'May 8', amount: 720 },
  { date: 'May 14', amount: 690 },
  { date: 'May 21', amount: 760 },
  { date: 'May 28', amount: 730 },
  { date: 'Jun 3', amount: 810 },
]

export const Route = createFileRoute('/(app)/')({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(getProfileOptions)
  },
  component: App,
})

function App() {
  const [plansRange, setPlansRange] = React.useState<RangeValue>('3m')
  const [transactionsRange, setTransactionsRange] =
    React.useState<RangeValue>('3m')

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
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <CardTitle className="text-sm font-medium">
                    Total Users
                  </CardTitle>
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    ↑ 12.5%
                  </span>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-2xl font-semibold tracking-tight">
                    12,345
                  </p>
                  <CardDescription>
                    Trending up this month. Overall user base growth.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card size="sm">
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <CardTitle className="text-sm font-medium">
                    Total Plans Created
                  </CardTitle>
                  <span className="text-xs font-medium text-red-600 dark:text-red-400">
                    ↓ 20%
                  </span>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-2xl font-semibold tracking-tight">1,234</p>
                  <CardDescription>
                    Down this period. Plan creation needs attention.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card size="sm">
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <CardTitle className="text-sm font-medium">
                    Total Plans Completed
                  </CardTitle>
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    ↑ 12.5%
                  </span>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-2xl font-semibold tracking-tight">
                    45,678
                  </p>
                  <CardDescription>
                    Strong completion rate. Users stay engaged.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card size="sm">
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <CardTitle className="text-sm font-medium">
                    Total Transactions
                  </CardTitle>
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    ↑ 4.5%
                  </span>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-2xl font-semibold tracking-tight">
                    $1,250.00
                  </p>
                  <CardDescription>
                    Steady performance. Meets current projections.
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
                      data={plansPerDayData}
                      margin={{ left: -16, right: 0, top: 16, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="plansMobile"
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
                        <linearGradient
                          id="plansDesktop"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="var(--chart-2)"
                            stopOpacity={0.6}
                          />
                          <stop
                            offset="95%"
                            stopColor="var(--chart-2)"
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
                        className="text-xs text-muted-foreground"
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          borderColor: 'var(--chart-4)',
                          backgroundColor: 'var(--chart-5)',
                          color: 'var(--chart-1)',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="mobile"
                        name="Mobile"
                        stroke="var(--chart-1)"
                        strokeWidth={2}
                        fill="url(#plansMobile)"
                      />
                      <Area
                        type="monotone"
                        dataKey="desktop"
                        name="Desktop"
                        stroke="var(--chart-2)"
                        strokeWidth={2}
                        fill="url(#plansDesktop)"
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
                      data={transactionsPerDayData}
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
                        className="text-xs text-muted-foreground"
                      />
                      <Tooltip
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
                        name="Transactions"
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
