import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import type { UserSearchParams, UserUpdatePayload } from '@/server/api/users'
import {
  deleteUser,
  getAdminUserById,
  getProfile,
  getUserById,
  searchUsers,
  updateUser,
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

/**
 * Admin-side variant — full record with PII, used by the User 360 page
 * and anywhere else that needs operator-level visibility. Same return
 * shape as `getUserByIdOptions` so consumers stay portable; the admin
 * server-fn unwraps `{ user, activity }` into `{ data: user, activity }`.
 */
export const getAdminUserByIdOptions = (userId: string | null) =>
  queryOptions({
    queryKey: ['users', 'admin', 'byId', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required')
      // @ts-expect-error - createServerFn types don't properly reflect data parameter
      return await getAdminUserById({ data: userId })
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

export const USERS_LIST_BATCH_SIZE = 24

export const searchUsersInfiniteOptions = (
  baseParams: Omit<UserSearchParams, 'page'>,
  batchSize = USERS_LIST_BATCH_SIZE,
) =>
  infiniteQueryOptions({
    queryKey: ['users', 'search', 'infinite', baseParams, batchSize],
    queryFn: async ({ pageParam }) => {
      const params: UserSearchParams = {
        ...baseParams,
        page: pageParam,
        limit: batchSize,
      }
      // @ts-expect-error - createServerFn types don't properly reflect POST data parameter
      return await searchUsers({ data: params })
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      const payload = lastPage?.data as
        | {
            users?: Array<unknown>
            total?: number
            totalPages?: number
            pagination?: { totalPages?: number }
          }
        | undefined
      const batch = payload?.users ?? []
      if (batch.length < batchSize) return undefined

      const total = payload?.total ?? payload?.pagination?.totalUsers ?? 0
      const loaded = allPages.reduce(
        (sum, page) =>
          sum +
          (((page.data as { users?: Array<unknown> } | undefined)?.users
            ?.length) ?? 0),
        0,
      )
      if (total > 0 && loaded >= total) return undefined

      const totalPages =
        payload?.totalPages ??
        payload?.pagination?.totalPages ??
        (total > 0 ? Math.ceil(total / batchSize) : undefined)

      if (totalPages != null && lastPageParam >= totalPages) return undefined
      return lastPageParam + 1
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

type DeleteUserResult = { success: boolean; data: any }

export const deleteUserOptions = (id: string) => ({
  mutationKey: ['users', 'delete', id],
  mutationFn: async (): Promise<DeleteUserResult> => {
    // @ts-expect-error - createServerFn types don't properly reflect data parameter
    return await deleteUser({ data: id })
  },
})
