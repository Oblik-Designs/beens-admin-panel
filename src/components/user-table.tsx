import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { userColumns, type User } from '@/constants/userDataColumns'
import { UserSheet } from '@/components/user-sheet'
import { TableWithPagination } from '@/components/table-with-pagination'
import { deleteUserOptions } from '@/queries/users'

export type UserTableFilters = {
  status: string
  role: string
  gender: string
  kycStatus: string
  sortOrder: 'asc' | 'desc'
}

type UserTableProps = {
  data: User[]
  pageIndex: number
  pageSize: number
  pageCount: number
  onPageChange: (pageIndex: number) => void
  onPageSizeChange: (pageSize: number) => void
  totalUsers: number
  isLoading?: boolean
}

export function UserTable({
  data,
  pageIndex,
  pageSize,
  pageCount,
  isLoading,
  onPageChange,
  onPageSizeChange,
}: UserTableProps) {
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null)

  const queryClient = useQueryClient()

  const deleteUserMutation = useMutation({
    mutationKey: ['users', 'delete'],
    mutationFn: async (userId: string) => {
      const { mutationFn } = deleteUserOptions(userId)
      return await mutationFn()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const handleViewUser = React.useCallback((user: User) => {
    setSelectedUser(user)
    setSheetOpen(true)
  }, [])

  const handleDeleteUser = React.useCallback(
    (user: User) => {
      deleteUserMutation.mutate(user._id)
    },
    [deleteUserMutation],
  )

  const handleSheetOpenChange = React.useCallback((open: boolean) => {
    setSheetOpen(open)
    if (!open) {
      setSelectedUser(null)
    }
  }, [])

  return (
    <>
      <TableWithPagination<User>
        data={data}
        columns={userColumns}
        getRowId={(row) => row._id}
        pageIndex={pageIndex}
        pageSize={pageSize}
        pageCount={pageCount}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        meta={{ onViewUser: handleViewUser, onDeleteUser: handleDeleteUser }}
        emptyMessage="No users found."
        loadingMessage="Loading users data..."
        isLoading={isLoading}
      />

      <UserSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        user={selectedUser}
      />
    </>
  )
}
