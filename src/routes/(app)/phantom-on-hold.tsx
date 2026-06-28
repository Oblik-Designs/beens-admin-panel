import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { DownloadIcon, RefreshCwIcon } from 'lucide-react'

import type { PhantomOnHoldRow } from '@/server/api/phantom-on-hold'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { phantomOnHoldOptions } from '@/queries/phantom-on-hold'

/**
 * Phase 9 — Phantom On-Hold cohort page (§16.6 / Q4b).
 *
 * Read-only, standing surface listing every host hit by the phantom
 * "On Hold" bug (BNS-84). `status` derives server-side from whether the
 * FAILED parent txn still has un-reversed splits (OPEN) or not (RESOLVED),
 * so the table self-updates as hosts are cleared. No inline/batch resolve —
 * each row links to that host's 360, where the audited verified-reverse
 * Resolve lives (keeps Q4's deliberate per-host flow). Export CSV is built
 * from the loaded rows (the same table Julian gets from the ops script).
 */

export const Route = createFileRoute('/(app)/phantom-on-hold')({
    loader: ({ context }) =>
        context.queryClient.ensureQueryData(phantomOnHoldOptions()),
    component: PhantomOnHoldPage,
})

const CSV_HEADERS = [
    'hostName',
    'email',
    'userId',
    'txnId',
    'amount',
    'currency',
    'plan',
    'status',
] as const

function csvEscape(value: string | number): string {
    const s = String(value ?? '')
    // Quote when the value contains a comma, quote, or newline; double up
    // any embedded quotes per RFC 4180.
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
}

function rowsToCsv(rows: Array<PhantomOnHoldRow>): string {
    const lines = [CSV_HEADERS.join(',')]
    for (const r of rows) {
        lines.push(
            [
                r.hostName,
                r.email,
                r.userId,
                r.txnId,
                r.amount,
                r.currency,
                r.plan,
                r.status,
            ]
                .map(csvEscape)
                .join(','),
        )
    }
    return lines.join('\n')
}

function downloadCsv(rows: Array<PhantomOnHoldRow>) {
    const blob = new Blob([rowsToCsv(rows)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const stamp = new Date().toISOString().slice(0, 10)
    a.download = `phantom-on-hold-${stamp}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
}

function PhantomOnHoldPage() {
    const navigate = Route.useNavigate()
    const { data, isLoading, isFetching, refetch } = useQuery(
        phantomOnHoldOptions(),
    )

    const rows: Array<PhantomOnHoldRow> = data?.data ?? []
    const openCount = rows.filter((r) => r.status === 'OPEN').length

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
                <SiteHeader title="Phantom On Hold" />
                <div className="flex flex-1 flex-col">
                    <div className="@container/main flex flex-1 flex-col gap-2">
                        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                            <div className="flex flex-col gap-3 px-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
                                <p className="max-w-2xl text-xs text-muted-foreground">
                                    Hosts whose FAILED transactions left
                                    un-reversed splits (BNS-84). Rows clear to{' '}
                                    <span className="font-medium">RESOLVED</span>{' '}
                                    automatically once the verified reverse runs
                                    on the host&apos;s 360. Withdrawable balance
                                    is unaffected — this is data reconciliation
                                    only.
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8"
                                        onClick={() => refetch()}
                                    >
                                        <RefreshCwIcon className="mr-2 size-4" />
                                        Refresh
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8"
                                        disabled={rows.length === 0}
                                        onClick={() => downloadCsv(rows)}
                                    >
                                        <DownloadIcon className="mr-2 size-4" />
                                        Export CSV
                                    </Button>
                                </div>
                            </div>

                            <div className="px-4 text-xs text-muted-foreground lg:px-6">
                                {isLoading
                                    ? 'Loading…'
                                    : `${rows.length} host${rows.length === 1 ? '' : 's'} · ${openCount} open`}
                                {isFetching && !isLoading ? ' · refreshing…' : ''}
                            </div>

                            <div className="px-4 lg:px-6">
                                <div className="overflow-hidden rounded-lg border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Host</TableHead>
                                                <TableHead>Email</TableHead>
                                                <TableHead>Txn</TableHead>
                                                <TableHead className="text-right">
                                                    Amount
                                                </TableHead>
                                                <TableHead>Plan</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {isLoading &&
                                                Array.from({ length: 8 }).map(
                                                    (_, i) => (
                                                        <TableRow key={i}>
                                                            {Array.from({
                                                                length: 6,
                                                            }).map((__, j) => (
                                                                <TableCell key={j}>
                                                                    <Skeleton className="h-4 w-20" />
                                                                </TableCell>
                                                            ))}
                                                        </TableRow>
                                                    ),
                                                )}

                                            {!isLoading && rows.length === 0 && (
                                                <TableRow>
                                                    <TableCell
                                                        colSpan={6}
                                                        className="py-10 text-center text-sm text-muted-foreground"
                                                    >
                                                        No phantom On-Hold hosts —
                                                        the cohort is clear.
                                                    </TableCell>
                                                </TableRow>
                                            )}

                                            {!isLoading &&
                                                rows.map((row) => (
                                                    <TableRow
                                                        key={`${row.userId}:${row.txnId}`}
                                                        className="cursor-pointer"
                                                        onClick={() =>
                                                            navigate({
                                                                to: '/users/$userId',
                                                                params: {
                                                                    userId: row.userId,
                                                                },
                                                            })
                                                        }
                                                    >
                                                        <TableCell className="font-medium">
                                                            {row.hostName || '—'}
                                                        </TableCell>
                                                        <TableCell className="text-xs text-muted-foreground">
                                                            {row.email || '—'}
                                                        </TableCell>
                                                        <TableCell className="max-w-[12rem] truncate font-mono text-xs">
                                                            {row.txnId}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono text-sm tabular-nums">
                                                            ฿
                                                            {Number(
                                                                row.amount ?? 0,
                                                            ).toLocaleString(
                                                                undefined,
                                                                {
                                                                    minimumFractionDigits: 2,
                                                                    maximumFractionDigits: 2,
                                                                },
                                                            )}{' '}
                                                            {row.currency}
                                                        </TableCell>
                                                        <TableCell className="max-w-[16rem] truncate text-sm">
                                                            {row.plan || '—'}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant={
                                                                    row.status ===
                                                                    'OPEN'
                                                                        ? 'destructive'
                                                                        : 'secondary'
                                                                }
                                                            >
                                                                {row.status}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
