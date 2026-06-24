import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'

import type { User } from '@/constants/userDataColumns'
import { userColumns } from '@/constants/userDataColumns'
import { TableWithPagination } from '@/components/table-with-pagination'
import { updateUserOptions } from '@/queries/users'
import type { UserKycUpdate, UserUpdatePayload } from '@/server/api/users'

type UserTableProps = {
  data: Array<User>
  pageIndex: number
  pageSize: number
  pageCount: number
  onPageChange: (pageIndex: number) => void
  onPageSizeChange: (pageSize: number) => void
  totalUsers: number
  isLoading?: boolean
  onRowClick?: (user: User) => void
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

export function UserTable({
  data,
  pageIndex,
  pageSize,
  pageCount,
  isLoading,
  onPageChange,
  onPageSizeChange,
  onRowClick,
}: UserTableProps) {
  const [pendingUserId, setPendingUserId] = React.useState<string | null>(null)
  const queryClient = useQueryClient()

  // One mutation factory shared across status / kyc — each inline
  // control resolves the payload and the per-row spinner key the same
  // way. Destructive actions (Make Elite, Delete) live on the User 360
  // page now.
  const runUpdate = React.useCallback(
    async (user: User, payload: UserUpdatePayload) => {
      setPendingUserId(user._id)
      try {
        const { mutationFn } = updateUserOptions(user._id)
        await mutationFn(payload)
        await queryClient.invalidateQueries({ queryKey: ['users'] })
      } finally {
        setPendingUserId(null)
      }
    },
    [queryClient],
  )

  const handleUpdateStatus = React.useCallback(
    (user: User, status: string) => {
      void runUpdate(user, { status })
    },
    [runUpdate],
  )

  const handleUpdateKyc = React.useCallback(
    (user: User, kycStatus: NonNullable<User['kyc']>['status']) => {
      void runUpdate(user, {
        kyc: {
          status: kycStatus,
          verificationStatus: KYC_STATUS_TO_VERIFICATION_STATUS[kycStatus],
        },
      })
    },
    [runUpdate],
  )

  return (
    <TableWithPagination<User>
      data={data}
      columns={userColumns}
      getRowId={(row) => row._id}
      pageIndex={pageIndex}
      pageSize={pageSize}
      pageCount={pageCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      meta={{
        onUpdateStatus: handleUpdateStatus,
        onUpdateKyc: handleUpdateKyc,
        isPendingForUserId: pendingUserId,
      }}
      emptyMessage="No users found."
      loadingMessage="Loading users data..."
      isLoading={isLoading}
      onRowClick={onRowClick}
    />
  )
}
