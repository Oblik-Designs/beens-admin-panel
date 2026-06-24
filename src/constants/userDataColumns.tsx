import { Link } from '@tanstack/react-router'
import { SquareArrowOutUpRight, UserIcon } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
}

export type UserTableMeta = {
  /**
   * Inline mutators for the Status / KYC dropdowns. Implementations are
   * wired in `UserTable` and call the existing `updateUser` mutation.
   * Destructive actions (Make Elite, Delete) live on the User 360 page.
   */
  onUpdateStatus?: (user: User, status: string) => void
  onUpdateKyc?: (user: User, kycStatus: NonNullable<User['kyc']>['status']) => void
  /** Per-row in-flight flag so the dropdowns disable while a mutation runs. */
  isPendingForUserId?: string | null
}

const KYC_LABEL: Record<NonNullable<User['kyc']>['status'], string> = {
  NOT_STARTED: 'Not started',
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}

export const userColumns: Array<ColumnDef<User>> = [
  {
    id: 'fullName',
    header: 'Full Name',
    cell: ({ row }) => {
      const { firstName, lastName, profileImage } = row.original
      const name = `${firstName} ${lastName}`.trim()
      return (
        <div className="flex items-center gap-2 px-4 py-1">
          <Avatar className="size-7">
            <AvatarImage src={profileImage} alt={name} />
            <AvatarFallback className="text-muted-foreground bg-transparent border">
              <UserIcon className="size-3.25" />
            </AvatarFallback>
          </Avatar>
          <span>{name}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'email',
    header: () => <span>Email</span>,
    meta: { className: 'px-4' },
    cell: ({ row }) => (
      <span className="block max-w-[200px] truncate" title={row.original.email}>
        {row.original.email ?? '-'}
      </span>
    ),
  },
  {
    accessorKey: 'phone',
    header: () => <span>Phone</span>,
    cell: ({ row }) => <span>{row.original.phone ?? '-'}</span>,
  },
  {
    accessorKey: 'address.country',
    header: () => <span>Country</span>,
    cell: ({ row }) => <span>{row.original.address?.country ?? '-'}</span>,
  },
  {
    accessorKey: 'totalPlans',
    header: 'Total Plans',
    cell: ({ row }) => {
      const totalPlans = row.original.totalPlans
      const creatorId = row.original._id
      if (!totalPlans || totalPlans === 0)
        return (
          <div className="flex items-center gap-1 italic text-muted-foreground">
            <span>No Plans Yet</span>
          </div>
        )
      return (
        <Link
          to="/plans"
          search={
            {
              page: 1,
              limit: 10,
              creator: creatorId,
            } as never
          }
          className="flex items-center gap-1 underline"
          onClick={(event) => event.stopPropagation()}
        >
          <span>{totalPlans} Plans</span>
          <SquareArrowOutUpRight className="size-3.5" />
        </Link>
      )
    },
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row, table }) => {
      const meta = table.options.meta as UserTableMeta | undefined
      const onUpdateStatus = meta?.onUpdateStatus
      const isPending = meta?.isPendingForUserId === row.original._id
      const value = row.original.status ?? 'UNVERIFIED'

      return (
        <div
          onClick={(event) => event.stopPropagation()}
          className="inline-flex"
        >
          <Select
            value={value}
            onValueChange={(next) => {
              if (!onUpdateStatus || !next || next === value) return
              onUpdateStatus(row.original, next)
            }}
            disabled={!onUpdateStatus || isPending}
          >
            <SelectTrigger size="sm" className="h-7 min-w-[112px] text-xs">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="UNVERIFIED">Unverified</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )
    },
  },
  {
    id: 'kyc',
    header: 'KYC',
    cell: ({ row, table }) => {
      const meta = table.options.meta as UserTableMeta | undefined
      const onUpdateKyc = meta?.onUpdateKyc
      const isPending = meta?.isPendingForUserId === row.original._id
      const value = row.original.kyc?.status ?? 'NOT_STARTED'

      return (
        <div
          onClick={(event) => event.stopPropagation()}
          className="inline-flex"
        >
          <Select
            value={value}
            onValueChange={(next) => {
              if (!onUpdateKyc || !next || next === value) return
              onUpdateKyc(
                row.original,
                next as NonNullable<User['kyc']>['status'],
              )
            }}
            disabled={!onUpdateKyc || isPending}
          >
            <SelectTrigger size="sm" className="h-7 min-w-[120px] text-xs">
              <SelectValue placeholder="Select KYC" />
            </SelectTrigger>
            <SelectContent>
              {(
                Object.keys(KYC_LABEL) as Array<
                  NonNullable<User['kyc']>['status']
                >
              ).map((key) => (
                <SelectItem key={key} value={key}>
                  {KYC_LABEL[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    },
  },
]
