import { queryOptions } from '@tanstack/react-query'
import {
  getProfile,
  getUserById,
  searchUsers,
  updateUser,
  type UserSearchParams,
  type UserUpdatePayload,
} from '@/server/api/users'

export const getProfileOptions = queryOptions({
  queryKey: ['profile'],
  queryFn: async () => {
    return await getProfile()
  },
})

export const getUserByIdOptions = (userId: string | null) =>
  queryOptions({
    queryKey: ['users', 'byId', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required')
      // @ts-expect-error - createServerFn types don't properly reflect data parameter
      return await getUserById({ data: userId })
    },
    enabled: !!userId,
  })

export const searchUserOptions = (params?: UserSearchParams) =>
  queryOptions({
    queryKey: ['users', 'search', params],
    queryFn: async () => {
      // @ts-expect-error - createServerFn types don't properly reflect POST data parameter
      return await searchUsers({ data: params })
    },
  })

type UpdateUserResult = { success: boolean; data: any }

export const updateUserOptions = (id: string) => ({
  mutationKey: ['users', 'update', id],
  mutationFn: async (
    variables: UserUpdatePayload,
  ): Promise<UpdateUserResult> => {
    // @ts-expect-error - createServerFn types don't properly reflect data parameter
    return await updateUser({ data: { id, ...variables } })
  },
})
