import { createServerFn } from '@tanstack/react-start'
import { apiClient } from '../client'

export const getProfile = createServerFn({
  method: 'GET',
}).handler(async () => {
  const result = await apiClient.get('/user/profile')
  return result as { success: boolean; data: any }
})

export const getUserById = createServerFn({
  method: 'GET',
}).handler(async (ctx) => {
  const id = ctx.data as string | undefined
  if (!id) {
    throw new Error('User ID is required')
  }
  const result = await apiClient.get<{ success: boolean; data: any }>(
    `/user/${id}`,
  )
  return result
})

/**
 * Admin variant — calls /admin/users/:userId which returns the full
 * unsanitised record (email, phone, address, etc.) plus a small
 * activity rollup. The public /user/:id endpoint runs the response
 * through `sanitizeUserForPublic` which strips PII; use this getter
 * anywhere that needs operator-level visibility (User 360 page, etc).
 *
 * Response shape: { success, data: { user, activity } } — unwrapped
 * to `{ success, data: user }` to match getUserById's contract so
 * existing consumers stay portable.
 */
export const getAdminUserById = createServerFn({
  method: 'GET',
}).handler(async (ctx) => {
  const id = ctx.data as string | undefined
  if (!id) {
    throw new Error('User ID is required')
  }
  const result = await apiClient.get<{
    success: boolean
    data: { user: any; activity: any }
  }>(`/admin/users/${id}`)
  return {
    success: result.success,
    data: result.data.user,
    activity: result.data.activity,
  } as { success: boolean; data: any; activity: any }
})

export interface UserSearchFilter {
  status?: string
  role?: string
  level?: string
  subscription?: string
  kycStatus?: string
  kycVerificationStatus?: string
  isEmailVerified?: boolean
  isPhoneVerified?: boolean
  walletMin?: number
  walletMax?: number
  gender?: string
  ageMin?: number
  ageMax?: number
  dobMin?: string
  dobMax?: string
  createdAtMin?: string
  createdAtMax?: string
}

export interface UserSearchParams {
  query?: string
  filter?: UserSearchFilter
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface UserSearchResponse {
  success: boolean
  data: {
    users: Array<any>
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface UserLocationUpdate {
  type?: 'Point'
  coordinates?: [number, number]
}

export interface UserAddressUpdate {
  street?: string
  city?: string
  state?: string
  country?: string
  zipcode?: string
  location?: UserLocationUpdate
}

export interface UserKycUpdate {
  status?: 'NOT_STARTED' | 'PENDING' | 'APPROVED' | 'REJECTED'
  verificationStatus?: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED'
  moderationComment?: string
  reviewerId?: string
  reviewDate?: string
}

export interface UserNotificationPreferencesUpdate {
  plan?: 'EMAIL' | 'PUSH' | 'BOTH' | 'NONE'
  invitation?: 'EMAIL' | 'PUSH' | 'BOTH' | 'NONE'
  application?: 'EMAIL' | 'PUSH' | 'BOTH' | 'NONE'
  message?: 'EMAIL' | 'PUSH' | 'BOTH' | 'NONE'
}

export interface UserProfilePreferencesUpdate {
  privateLastName?: boolean
  privateProfileImage?: boolean
  privateGender?: boolean
  privateAddress?: boolean
  privateDOB?: boolean
}

export interface UserAccessPreferencesUpdate {
  onlyHighLevel?: boolean
  onlyConnections?: boolean
}

export interface UserPreferencesUpdate {
  notifications?: UserNotificationPreferencesUpdate
  profile?: UserProfilePreferencesUpdate
  access?: UserAccessPreferencesUpdate
}

export interface UserUpdatePayload {
  firstName?: string
  lastName?: string
  displayName?: string
  email?: string
  isEmailVerified?: boolean
  phone?: string
  countryCode?: string
  isPhoneVerified?: boolean
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  dob?: string
  address?: UserAddressUpdate
  status?: string
  role?: string
  level?: string
  badge?: string
  profileImage?: string
  totalPlans?: number
  images?: Array<string>
  bio?: string
  highlight?: string
  subscription?: string
  subscriptionStart?: string
  subscriptionEnd?: string
  wallet?: number
  permanentElite?: boolean
  kyc?: UserKycUpdate
  preferences?: UserPreferencesUpdate
}

export const searchUsers = createServerFn({
  method: 'POST',
}).handler(async (ctx) => {
  const data = ctx.data as UserSearchParams | undefined
  if (!data) {
    throw new Error('Search parameters are required')
  }
  const result = await apiClient.post<UserSearchResponse>('/user/search', data)
  return result
})

export interface UpdateUserRequest extends UserUpdatePayload {
  id: string
}

export const updateUser = createServerFn({
  method: 'POST',
}).handler(async (ctx) => {
  const payload = ctx.data as UpdateUserRequest | undefined

  if (!payload || !payload.id) {
    throw new Error('User ID is required')
  }

  const { id, ...data } = payload

  const result = await apiClient.patch<{ success: boolean; data: any }>(
    `/user/${id}`,
    data,
  )

  return result
})

export interface DeleteUserResponse {
  success: boolean
  data: any
}

export const deleteUser = createServerFn({
  method: 'POST',
}).handler(async (ctx) => {
  const id = ctx.data as string | undefined

  if (!id) {
    throw new Error('User ID is required')
  }

  const result = await apiClient.delete<DeleteUserResponse>(`/user/${id}`)

  return result
})
