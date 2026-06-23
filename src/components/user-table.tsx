import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { User } from '@/constants/userDataColumns'
import { userColumns } from '@/constants/userDataColumns'
import { UserSheet } from '@/components/user-sheet'
import { TableWithPagination } from '@/components/table-with-pagination'
import { deleteUserOptions } from '@/queries/users'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

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
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null)
  const [pendingDelete, setPendingDelete] = React.useState<User | null>(null)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)

  const queryClient = useQueryClient()

  const deleteUserMutation = useMutation({
    mutationKey: ['users', 'delete'],
    mutationFn: async (userId: string) => {
      const { mutationFn } = deleteUserOptions(userId)
      return await mutationFn()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setPendingDelete(null)
      setDeleteError(null)
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Failed to delete user.'
      setDeleteError(message)
    },
  })

  const handleViewUser = React.useCallback((user: User) => {
    setSelectedUser(user)
    setSheetOpen(true)
  }, [])

  const handleDeleteUser = React.useCallback((user: User) => {
    setDeleteError(null)
    setPendingDelete(user)
  }, [])

  const handleConfirmDelete = React.useCallback(() => {
    if (!pendingDelete) return
    deleteUserMutation.mutate(pendingDelete._id)
  }, [pendingDelete, deleteUserMutation])

  const handleCancelDelete = React.useCallback(() => {
    if (deleteUserMutation.isPending) return
    setPendingDelete(null)
    setDeleteError(null)
  }, [deleteUserMutation.isPending])

  const handleSheetOpenChange = React.useCallback((open: boolean) => {
    setSheetOpen(open)
    if (!open) {
      setSelectedUser(null)
    }
  }, [])

  const pendingDeleteName = pendingDelete
    ? `${pendingDelete.firstName ?? ''} ${pendingDelete.lastName ?? ''}`.trim() ||
      pendingDelete.email ||
      pendingDelete._id
    : ''

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
        onRowClick={onRowClick}
      />

      <UserSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        user={selectedUser}
      />

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) handleCancelDelete()
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteName
                ? `${pendingDeleteName}'s account will be disabled. They won't be able to sign in until reinstated.`
                : 'This account will be disabled.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="text-destructive text-sm">{deleteError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteUserMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
