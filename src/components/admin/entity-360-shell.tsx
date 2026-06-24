import * as React from 'react'

import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

/**
 * Standard chrome for an entity 360 page (User / Plan / Transaction).
 *
 * Layout contract:
 *   - Page is viewport-height constrained — no page-level scroll.
 *   - Summary card sits at its natural height at the top.
 *   - The Timeline column owns the remaining vertical space and is
 *     internally scrollable (the Timeline component handles its own
 *     overflow + sticky toolbar).
 *   - The sidebar column scrolls independently when it overflows.
 */
export interface Entity360ShellProps {
    title: string
    /** Optional small-print caption under the title (e.g. raw entity id). */
    subtitle?: string
    summary?: React.ReactNode
    timeline: React.ReactNode
    sidebar?: React.ReactNode
}

export function Entity360Shell({
    title,
    subtitle,
    summary,
    timeline,
    sidebar,
}: Entity360ShellProps) {
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
            <SidebarInset className="h-svh overflow-hidden">
                <SiteHeader title={title} subtitle={subtitle} />

                <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden p-4 lg:p-6">
                    {summary && <section className="shrink-0">{summary}</section>}

                    <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-3">
                        <section className="flex min-h-0 flex-col overflow-hidden lg:col-span-2">
                            <div className="flex min-h-0 flex-1 flex-col gap-3 rounded-lg border bg-muted/40 px-4 py-3">
                                <div className="shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
                                    Timeline
                                </div>
                                <div className="min-h-0 flex-1">{timeline}</div>
                            </div>
                        </section>

                        <aside className="min-h-0 space-y-4 overflow-y-auto lg:col-span-1">
                            {sidebar}
                        </aside>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
