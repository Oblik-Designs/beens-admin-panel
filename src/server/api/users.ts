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
    users: any[]
    pagination: {
      page: number
      limit: number
      totalPages: number
      totalUsers: number
      hasNextPage: boolean
      hasPrevPage: boolean
    }
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
  verificationStatus?: 'UNVERIFIED' | 'VERIFIED'
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
  images?: string[]
  bio?: string
  highlight?: string
  subscription?: string
  subscriptionStart?: string
  subscriptionEnd?: string
  wallet?: number
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
