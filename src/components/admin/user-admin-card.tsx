import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { User } from '@/constants/userDataColumns'
import type { UserKycUpdate, UserUpdatePayload } from '@/server/api/users'
import { updateUserOptions } from '@/queries/users'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

/**
 * Admin controls for a single user — Elite Status / Account Status /
 * KYC Status.
 *
 * Lifted out of the old UserSheet (which appeared next to the table) so
 * the controls live where deep operator work happens: the User 360
 * sidebar. Save flushes all three fields in one updateUser call so the
 * audit row stays coherent.
 *
 * Delete user is rendered next to the Sumsub remediation actions (see
 * RemediationPanel `footerSlot`) — it's destructive enough that it
 * belongs with the rest of the user-on-user actions.
 *
 * The inline Status/KYC dropdowns in the users table cover quick
 * single-field edits; this card is the place to change multiple fields
 * with one round-trip.
 */
export interface UserAdminCardProps {
    user: User
    /** Optional callback fired after a successful save. */
    onSaved?: () => void
}

const KYC_STATUS_TO_VERIFICATION_STATUS: Record<
    NonNullable<User['kyc']>['status'],
    NonNullable<UserKycUpdate['verificationStatus']>
> = {
    NOT_STARTED: 'UNVERIFIED',
    PENDING: 'PENDING',
    APPROVED: 'VERIFIED',
    REJECTED: 'REJECTED',
}

const KYC_LABEL: Record<NonNullable<User['kyc']>['status'], string> = {
    NOT_STARTED: 'Not started',
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
}

/** Local enum for the elite dropdown — derived from `permanentElite`. */
type EliteValue = 'PERMANENT' | 'STANDARD'

const eliteValueOf = (user: User): EliteValue =>
    user.permanentElite ? 'PERMANENT' : 'STANDARD'

export function UserAdminCard({ user, onSaved }: UserAdminCardProps) {
    const queryClient = useQueryClient()

    const [eliteValue, setEliteValue] = React.useState<EliteValue>(
        eliteValueOf(user),
    )
    const [status, setStatus] = React.useState<string>(user.status ?? '')
    const [kycStatus, setKycStatus] = React.useState<
        NonNullable<User['kyc']>['status']
    >(user.kyc?.status ?? 'NOT_STARTED')
    const [error, setError] = React.useState<string | null>(null)

    // Reset local state if the underlying user changes (e.g. server
    // refetch after an inline edit elsewhere).
    React.useEffect(() => {
        setEliteValue(eliteValueOf(user))
        setStatus(user.status ?? '')
        setKycStatus(user.kyc?.status ?? 'NOT_STARTED')
        setError(null)
    }, [user._id, user.status, user.kyc?.status, user.permanentElite])

    const mutation = useMutation({
        ...updateUserOptions(user._id),
        onSuccess: async () => {
            setError(null)
            await queryClient.invalidateQueries({ queryKey: ['users'] })
            onSaved?.()
        },
        onError: (err: unknown) => {
            setError(
                err instanceof Error ? err.message : 'Failed to update user.',
            )
        },
    })

    const hasChanges =
        eliteValue !== eliteValueOf(user) ||
        status !== (user.status ?? '') ||
        kycStatus !== (user.kyc?.status ?? 'NOT_STARTED')

    const handleSave = () => {
        if (!hasChanges) return

        const payload: UserUpdatePayload = {}
        if (eliteValue !== eliteValueOf(user)) {
            payload.permanentElite = eliteValue === 'PERMANENT'
        }
        if (status !== (user.status ?? '')) payload.status = status
        if (kycStatus !== (user.kyc?.status ?? 'NOT_STARTED')) {
            payload.kyc = {
                status: kycStatus,
                verificationStatus: KYC_STATUS_TO_VERIFICATION_STATUS[kycStatus],
            }
        }

        if (Object.keys(payload).length === 0) return
        mutation.mutate(payload)
    }

    return (
        <div className="space-y-4 rounded-lg border bg-muted/40 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
                User admin
            </div>

            <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                    <label
                        htmlFor="user-admin-elite"
                        className="text-muted-foreground"
                    >
                        Elite Status
                    </label>
                    <Select
                        value={eliteValue}
                        onValueChange={(value) =>
                            setEliteValue(
                                value === 'PERMANENT' ? 'PERMANENT' : 'STANDARD',
                            )
                        }
                        disabled={mutation.isPending}
                    >
                        <SelectTrigger
                            id="user-admin-elite"
                            size="sm"
                            className="h-8 min-w-[200px] text-xs"
                        >
                            <SelectValue placeholder="Select elite status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="PERMANENT">
                                Permanent Elite
                            </SelectItem>
                            <SelectItem value="STANDARD">
                                Standard (default, non-elite)
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center justify-between gap-3">
                    <label
                        htmlFor="user-admin-status"
                        className="text-muted-foreground"
                    >
                        Account Status
                    </label>
                    <Select
                        value={status}
                        onValueChange={(value) => setStatus(value ?? '')}
                        disabled={mutation.isPending}
                    >
                        <SelectTrigger
                            id="user-admin-status"
                            size="sm"
                            className="h-8 min-w-[200px] text-xs"
                        >
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="UNVERIFIED">Unverified</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center justify-between gap-3">
                    <label
                        htmlFor="user-admin-kyc"
                        className="text-muted-foreground"
                    >
                        KYC Status
                    </label>
                    <Select
                        value={kycStatus}
                        onValueChange={(value) =>
                            setKycStatus(
                                (value as NonNullable<User['kyc']>['status']) ||
                                    'NOT_STARTED',
                            )
                        }
                        disabled={mutation.isPending}
                    >
                        <SelectTrigger
                            id="user-admin-kyc"
                            size="sm"
                            className="h-8 min-w-[200px] text-xs"
                        >
                            <SelectValue placeholder="Select KYC" />
                        </SelectTrigger>
                        <SelectContent>
                            {(
                                Object.keys(KYC_LABEL) as Array<
                                    NonNullable<User['kyc']>['status']
                                >
                            ).map((key) => (
                                <SelectItem key={key} value={key}>
                                    {KYC_LABEL[key]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <Button
                type="button"
                size="sm"
                className="w-full"
                onClick={handleSave}
                disabled={!hasChanges || mutation.isPending}
            >
                {mutation.isPending ? 'Saving…' : 'Save changes'}
            </Button>
        </div>
    )
}
