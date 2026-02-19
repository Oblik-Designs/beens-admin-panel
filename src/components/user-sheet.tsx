import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getUserByIdOptions } from '@/queries/users'
import { Button } from '@/components/ui/button'
import { DetailSheet } from '@/components/detail-sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { User } from '@/constants/userDataColumns'
import { updateUserOptions } from '@/queries/users'
import type { UserUpdatePayload } from '@/server/api/users'

type UserSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: User | null
  userId?: string | null
}

export function UserSheet({
  open,
  onOpenChange,
  user: userProp,
  userId,
}: UserSheetProps) {
  const queryClient = useQueryClient()

  const { data: userByIdResponse, isLoading: isUserLoading } = useQuery({
    ...getUserByIdOptions(userId && !userProp ? userId : null),
    enabled: open && !!userId && !userProp,
  })

  const user = userProp ?? (userByIdResponse?.data as User | undefined) ?? null

  const [status, setStatus] = React.useState<string>('')
  const [kycStatus, setKycStatus] = React.useState<User['kyc'] | ''>('')

  React.useEffect(() => {
    if (user) {
      setStatus(user.status ?? '')
      setKycStatus(user.kyc ?? '')
    } else {
      setStatus('')
      setKycStatus('')
    }
  }, [user])

  const mutation = useMutation({
    ...updateUserOptions(user?._id ?? ''),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      onOpenChange(false)
    },
  })

  const hasChanges =
    !!user &&
    ((status && status !== user.status) ||
      (kycStatus && kycStatus?.status !== user.kyc?.status))

  const handleSave = () => {
    if (!user || !hasChanges) return

    const payload: UserUpdatePayload = {}

    if (status && status !== user.status) {
      payload.status = status
    }

    if (kycStatus && kycStatus?.status !== user.kyc?.status) {
      payload.kyc = {
        status: kycStatus?.status,
      }
    }

    if (Object.keys(payload).length === 0) return

    mutation.mutate(payload)
  }

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title="User details"
      description="View and update the user's status and KYC status."
      footer={
        user && (
          <>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || mutation.isPending}
            >
              {mutation.isPending ? 'Saving...' : 'Save changes'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Close
            </Button>
          </>
        )
      }
    >
      {isUserLoading && (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Loading user details...
        </div>
      )}
      {!isUserLoading && user && (
        <>
            <div className="space-y-1 rounded-lg border bg-muted/40 px-4 py-3">
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                <span>Basic info</span>
                <span className="rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-medium">
                  {user.status}
                </span>
              </div>
              <div className="mt-4 space-y-4 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Name</span>
                  <span className="truncate font-medium">
                    {user.firstName} {user.lastName}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Email</span>
                  <span className="truncate font-medium">{user.email}</span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="truncate font-medium">{user.phone}</span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Country</span>
                  <span className="truncate font-medium">
                    {user.address?.country}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Status</span>
                  <span className="truncate font-medium">
                    <Select
                      value={status}
                      onValueChange={(value) => setStatus(value ?? '')}
                      disabled={mutation.isPending}
                    >
                      <SelectTrigger className="h-0 text-xs">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="UNVERIFIED">Unverified</SelectItem>
                      </SelectContent>
                    </Select>
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">KYC Status</span>
                  <span className="truncate font-medium">
                    <Select
                      value={
                        typeof kycStatus === 'object' && kycStatus
                          ? kycStatus.status
                          : (user.kyc?.status ?? '')
                      }
                      onValueChange={(value) =>
                        setKycStatus(
                          value
                            ? {
                                status: value as NonNullable<
                                  User['kyc']
                                >['status'],
                              }
                            : '',
                        )
                      }
                      disabled={mutation.isPending}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select KYC status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NOT_STARTED">Not started</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="APPROVED">Approved</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </span>
                </div>
              </div>
            </div>
        </>
      )}
    </DetailSheet>
  )
}
