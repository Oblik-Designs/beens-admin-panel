import type { UserSearchParams, UserSearchResponse } from '@/server/api/users'
import { isEliteUser } from '@/constants/userDataColumns'
import { apiClient } from '../client'

function matchesEliteFilter(
  user: { permanentElite?: boolean; subscriptionEnd?: string },
  elite?: boolean,
): boolean {
  if (elite === true) return isEliteUser(user)
  if (elite === false) return !isEliteUser(user)
  return true
}

function apiHonoredEliteFilter(
  users: Array<{ permanentElite?: boolean; subscriptionEnd?: string }>,
  elite?: boolean,
): boolean {
  if (elite === undefined) return true
  return !users.some((user) => !matchesEliteFilter(user, elite))
}

async function scanUsersWithEliteFilter(
  data: UserSearchParams,
): Promise<UserSearchResponse> {
  const elite = data.filter?.elite
  const { page = 1, limit = 30, filter, ...rest } = data
  const baseFilter = filter ? { ...filter } : undefined
  if (baseFilter) delete baseFilter.elite

  const matches: Array<any> = []
  let apiPage = 1
  const apiLimit = 100
  const maxPages = 200

  while (apiPage <= maxPages) {
    const result = await apiClient.post<UserSearchResponse>('/user/search', {
      ...rest,
      page: apiPage,
      limit: apiLimit,
      ...(baseFilter && Object.keys(baseFilter).length
        ? { filter: baseFilter }
        : {}),
    })

    const batch = result.data?.users ?? []
    if (!batch.length) break

    for (const user of batch) {
      if (matchesEliteFilter(user, elite)) matches.push(user)
    }

    if (batch.length < apiLimit) break
    apiPage++
  }

  const start = (page - 1) * limit
  const users = matches.slice(start, start + limit)
  const total = matches.length

  return {
    success: true,
    data: {
      users,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  }
}

export async function searchUsersWithEliteSupport(
  data: UserSearchParams,
): Promise<UserSearchResponse> {
  const elite = data.filter?.elite
  if (elite === undefined) {
    return apiClient.post<UserSearchResponse>('/user/search', data)
  }

  const result = await apiClient.post<UserSearchResponse>('/user/search', data)
  const batch = result.data?.users ?? []

  if (apiHonoredEliteFilter(batch, elite)) {
    return result
  }

  return scanUsersWithEliteFilter(data)
}
