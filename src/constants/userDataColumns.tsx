export type User = {
  _id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  status: string
  role: string
  kyc?: {
    status: 'NOT_STARTED' | 'PENDING' | 'APPROVED' | 'REJECTED'
  }
  address?: {
    street: string
    city: string
    state: string
    country: string
    zipcode: string
  }
  totalPlans?: number
  profileImage?: string
  permanentElite?: boolean
  subscriptionEnd?: string
}

export function isEliteUser(user: Pick<User, 'permanentElite' | 'subscriptionEnd'>) {
  if (user.permanentElite) return true
  if (!user.subscriptionEnd) return false
  return new Date(user.subscriptionEnd) > new Date()
}

export const KYC_LABEL: Record<NonNullable<User['kyc']>['status'], string> = {
  NOT_STARTED: 'Not started',
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}
