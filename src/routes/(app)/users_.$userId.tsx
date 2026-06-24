import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import type { User } from '@/constants/userDataColumns'
import { DeleteUserButton } from '@/components/admin/delete-user-button'
import { Entity360Shell } from '@/components/admin/entity-360-shell'
import { RemediationPanel } from '@/components/admin/remediation-panel'
import { Timeline } from '@/components/admin/timeline'
import { UserAdminCard } from '@/components/admin/user-admin-card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
    applyRemediationAction,
    previewRemediationAction,
    remediationContextOptions,
    userTimelineOptions,
} from '@/queries/crisis'
import { getAdminUserByIdOptions } from '@/queries/users'

/**
 * User 360 — Phase 3 / L1 of the Crisis Console.
 *
 * Stitches every source that touches this user into a single timeline:
 *   user status changes, KYC events, transactions, plans created/joined,
 *   webhook events (`linkedUserId`), audit entries, notifications.
 *
 * Header shows the user's actual name + identifying fields; the raw id
 * lives below as monospace metadata. The unified timeline + remediation
 * panel still come from the Phase 3 placeholder queries.
 */

export const Route = createFileRoute('/(app)/users_/$userId')({
    component: UserDetailPage,
})

function UserDetailPage() {
    const { userId } = Route.useParams()

    const { data: userRes, isLoading: userLoading } = useQuery(
        getAdminUserByIdOptions(userId),
    )
    const { data: timelineRes, isLoading: timelineLoading } = useQuery(
        userTimelineOptions(userId),
    )
    const { data: remediationRes } = useQuery(
        remediationContextOptions('User', userId),
    )

    const user = (userRes?.data ?? {}) as Record<string, any>
    const displayName = resolveDisplayName(user)
    const timelineEvents = timelineRes?.data ?? []
    const remediationContext = remediationRes?.data

    // TODO(Phase 5): pull the live admin's role from the session/auth query.
    const actorRole = 'MANAGER' as const

    return (
        <Entity360Shell
            title={displayName ?? 'User'}
            subtitle={userId}
            summary={
                <UserSummaryCard
                    user={user}
                    userId={userId}
                    isLoading={userLoading}
                />
            }
            timeline={
                timelineLoading ? (
                    <div className="h-full animate-pulse rounded-lg border bg-muted/40" />
                ) : (
                    <Timeline events={timelineEvents} />
                )
            }
            sidebar={
                <>
                    {userLoading || !user._id ? (
                        <div className="h-48 animate-pulse rounded-lg border bg-muted/40" />
                    ) : (
                        <UserAdminCard user={user as User} />
                    )}
                    {remediationContext ? (
                        <RemediationPanel
                            context={remediationContext}
                            actorRole={actorRole}
                            onPreview={previewRemediationAction}
                            onApply={async (action, reason) => {
                                const res = await applyRemediationAction(
                                    action,
                                    reason,
                                )
                                return { auditEntryId: res.auditEntryId }
                            }}
                            footerSlot={
                                user._id ? (
                                    <DeleteUserButton user={user as User} />
                                ) : null
                            }
                        />
                    ) : (
                        <div className="h-32 animate-pulse rounded-lg border bg-muted/40" />
                    )}
                </>
            }
        />
    )
}

function resolveDisplayName(user: Record<string, any>): string | null {
    if (!user) return null
    const display = (user.displayName as string | undefined)?.trim()
    if (display) return display
    const first = (user.firstName as string | undefined) ?? ''
    const last = (user.lastName as string | undefined) ?? ''
    const joined = `${first} ${last}`.trim()
    return joined || null
}

function initialsOf(name: string | null): string {
    if (!name) return '?'
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('')
}

interface UserSummaryCardProps {
    user: Record<string, any>
    userId: string
    isLoading: boolean
}

function UserSummaryCard({ user, userId, isLoading }: UserSummaryCardProps) {
    if (isLoading) {
        return (
            <div className="rounded-lg border bg-muted/40 px-4 py-3">
                <div className="flex flex-wrap items-start gap-6">
                    <div className="w-80 shrink-0 space-y-1.5">
                        <Skeleton className="h-3 w-12" />
                        <div className="flex items-start gap-3">
                            <Skeleton className="size-10 rounded-full" />
                            <div className="flex-1 space-y-1.5">
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-3 w-56" />
                            </div>
                        </div>
                    </div>
                    {[
                        { width: 'w-56', valueWidth: 'w-40' },
                        { width: 'w-32', valueWidth: 'w-20' },
                        { width: 'w-32', valueWidth: 'w-20' },
                        { width: 'w-32', valueWidth: 'w-20' },
                        { width: 'w-32', valueWidth: 'w-24' },
                    ].map((col, i) => (
                        <div
                            key={i}
                            className={`${col.width} shrink-0 space-y-1.5`}
                        >
                            <Skeleton className="h-3 w-14" />
                            <Skeleton className={`h-4 ${col.valueWidth}`} />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    const displayName = resolveDisplayName(user) ?? 'Unknown user'
    const email = (user.email as string | undefined) ?? null
    const phone = (user.phone as string | undefined) ?? null
    const country = (user.address?.country as string | undefined) ?? null
    const kycStatus = (user.kyc?.status as string | undefined) ?? null
    const wallet = user.wallet as number | undefined
    const profileImage = (user.profileImage as string | undefined) ?? undefined

    return (
        <div className="rounded-lg border bg-muted/40 px-4 py-3">
            <div className="flex flex-wrap items-start gap-6">
                {/* User identity column — fixed width, wider for avatar + meta */}
                <div className="w-80 shrink-0 space-y-1.5">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        User
                    </div>
                    <div className="flex items-start gap-3">
                        <Avatar className="size-10 shrink-0">
                            <AvatarImage src={profileImage} alt={displayName} />
                            <AvatarFallback>{initialsOf(displayName)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="truncate text-sm font-semibold">
                                {displayName}
                            </div>
                            <code className="block truncate text-[11px] text-muted-foreground">
                                {userId}
                            </code>
                        </div>
                    </div>
                </div>

                <StatColumn label="Email" value={email} width="w-56" />
                <StatColumn label="Phone" value={phone} />
                <StatColumn label="Country" value={country} />
                <StatColumn label="KYC" value={kycStatus?.toLowerCase()} />
                <StatColumn
                    label="Wallet"
                    value={
                        typeof wallet === 'number'
                            ? `฿${wallet.toFixed(2)}`
                            : undefined
                    }
                    mono
                />
            </div>
        </div>
    )
}

interface StatColumnProps {
    label: string
    value: string | null | undefined
    mono?: boolean
    /** Tailwind width class — default `w-32`. */
    width?: string
}

function StatColumn({ label, value, mono, width = 'w-32' }: StatColumnProps) {
    return (
        <div className={`${width} shrink-0 space-y-1`}>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {label}
            </div>
            <div
                className={`truncate ${
                    mono
                        ? 'font-mono text-sm font-medium tabular-nums'
                        : 'text-sm font-medium'
                }`}
            >
                {value && value.length > 0 ? value : '-'}
            </div>
        </div>
    )
}
