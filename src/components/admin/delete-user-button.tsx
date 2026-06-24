import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'

import type { User } from '@/constants/userDataColumns'
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
import { Button } from '@/components/ui/button'

/**
 * Destructive "Delete user" action — rendered as the RemediationPanel
 * footerSlot on the User 360 page so it sits alongside the Sumsub
 * remediation actions.
 *
 * Layout matches the UserAdminCard "Save changes" button (full-width,
 * size sm) — solid red background with white text to distinguish it as
 * destructive. Navigates back to /users on success.
 */
export interface DeleteUserButtonProps {
    user: User
}

export function DeleteUserButton({ user }: DeleteUserButtonProps) {
    const queryClient = useQueryClient()
    const navigate = useNavigate()

    const [open, setOpen] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    const mutation = useMutation({
        mutationKey: ['users', 'delete', user._id],
        mutationFn: async () => {
            const { mutationFn } = deleteUserOptions(user._id)
            return await mutationFn()
        },
        onSuccess: async () => {
            setError(null)
            await queryClient.invalidateQueries({ queryKey: ['users'] })
            setOpen(false)
            navigate({ to: '/users', search: {} as never })
        },
        onError: (err: unknown) => {
            setError(
                err instanceof Error ? err.message : 'Failed to delete user.',
            )
        },
    })

    const fullName =
        `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() ||
        user.email ||
        user._id

    return (
        <>
            <Button
                type="button"
                size="sm"
                className="w-full bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/40"
                onClick={() => {
                    setError(null)
                    setOpen(true)
                }}
                disabled={mutation.isPending}
            >
                Delete user
            </Button>

            <AlertDialog
                open={open}
                onOpenChange={(next) => {
                    if (mutation.isPending) return
                    if (!next) {
                        setOpen(false)
                        setError(null)
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this user?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {fullName}&apos;s account will be disabled. They
                            won&apos;t be able to sign in until reinstated.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {error && (
                        <p className="text-destructive text-sm">{error}</p>
                    )}
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={mutation.isPending}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={() => mutation.mutate()}
                            disabled={mutation.isPending}
                        >
                            {mutation.isPending ? 'Deleting…' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
