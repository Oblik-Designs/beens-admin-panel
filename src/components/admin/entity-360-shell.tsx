import * as React from 'react'

import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

/**
 * Standard chrome for an entity 360 page (User / Plan / Transaction).
 * Provides the sidebar + header + grid:
 *   [ timeline column (lg) | sidebar column (md): status + remediation ]
 *
 * The route file passes the title, summary card, timeline, and
 * remediation panel as render slots — no other coupling.
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
            <SidebarInset>
                <SiteHeader title={title} subtitle={subtitle} />

                <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
                    {summary && <section>{summary}</section>}

                    <div className="grid gap-6 lg:grid-cols-3">
                        <section className="lg:col-span-2">
                            <div className="space-y-3 rounded-lg border bg-muted/40 px-4 py-3">
                                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                                    Timeline
                                </div>
                                {timeline}
                            </div>
                        </section>

                        <aside className="space-y-4 lg:col-span-1">{sidebar}</aside>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
