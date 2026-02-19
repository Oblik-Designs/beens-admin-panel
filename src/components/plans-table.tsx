import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'

import { planColumns } from '@/constants/planDataColumns'
import type { Plan } from '@/server/api/plans'
import { DetailSheet } from '@/components/detail-sheet'
import { TableWithPagination } from '@/components/table-with-pagination'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getUserByIdOptions } from '@/queries/users'
import { UserIcon } from 'lucide-react'

type UserDetail = {
  _id?: string
  firstName?: string
  lastName?: string
  displayName?: string
  email?: string
  phone?: string
  gender?: string
  profileImage?: string
  status?: string
  address?: {
    street?: string
    city?: string
    state?: string
    country?: string
    zipcode?: string
  }
  kyc?: { status?: string }
  subscriptionEnd?: string
}

const formatDate = (value?: string) => {
  if (!value) return '-'
  try {
    const date = parseISO(value)
    if (Number.isNaN(date.getTime())) return value
    return format(date, 'MMM dd, yyyy')
  } catch {
    return value
  }
}

const formatAddress = (address?: UserDetail['address']) => {
  if (!address) return '-'
  const parts = [
    address.street,
    address.city,
    address.state,
    address.country,
    address.zipcode,
  ].filter(Boolean)
  return parts.length ? parts.join(', ') : '-'
}

type PlansTableProps = {
  data: Plan[]
  pageIndex: number
  pageSize: number
  pageCount: number
  onPageChange: (pageIndex: number) => void
  onPageSizeChange: (pageSize: number) => void
  isLoading?: boolean
}

export function PlansTable({
  data,
  pageIndex,
  pageSize,
  pageCount,
  isLoading,
  onPageChange,
  onPageSizeChange,
}: PlansTableProps) {
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [selectedCreatorId, setSelectedCreatorId] = React.useState<
    string | null
  >(null)

  const { data: userResponse, isLoading: isUserLoading } = useQuery({
    ...getUserByIdOptions(selectedCreatorId),
    enabled: sheetOpen && !!selectedCreatorId,
  })

  const user = (userResponse?.data as UserDetail | undefined) ?? null

  console.log('User Data: ', user)

  const handleCreatorClick = React.useCallback((userId: string) => {
    setSelectedCreatorId(userId)
    setSheetOpen(true)
  }, [])

  const handleSheetOpenChange = React.useCallback((open: boolean) => {
    setSheetOpen(open)
    if (!open) {
      setSelectedCreatorId(null)
    }
  }, [])

  const fullName =
    user?.displayName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
    'Unknown'

  return (
    <>
      <TableWithPagination<Plan>
        data={data}
        columns={planColumns}
        getRowId={(row) => row._id}
        pageIndex={pageIndex}
        pageSize={pageSize}
        pageCount={pageCount}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        meta={{ onCreatorClick: handleCreatorClick }}
        emptyMessage="No plans found."
        loadingMessage="Loading plans data..."
        isLoading={isLoading}
      />

      <DetailSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        title="Creator details"
        description="View the creator's profile information."
      >
        {isUserLoading && (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            Loading creator details...
          </div>
        )}
        {!isUserLoading && !user && (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            No creator details found.
          </div>
        )}
        {!isUserLoading && user && (
          <div className="space-y-1 rounded-lg border bg-muted/40 px-4 py-3">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
              <span>Profile</span>
              {user.status && (
                <span className="rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-medium">
                  {user.status}
                </span>
              )}
            </div>
            <div className="mt-4 space-y-4 text-sm">
              <div className="flex items-center gap-3">
                <Avatar className="size-12">
                  <AvatarImage src={user.profileImage} alt={fullName} />
                  <AvatarFallback className="text-muted-foreground border">
                    <UserIcon className="size-6" />
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{fullName}</span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Email</span>
                <span className="truncate font-medium">
                  {user.email ?? '-'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Phone</span>
                <span className="truncate font-medium">
                  {user.phone ?? '-'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Gender</span>
                <span className="truncate font-medium">
                  {user.gender ?? '-'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Address</span>
                <span className="max-w-50 truncate text-right font-medium">
                  {formatAddress(user.address)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Status</span>
                <span className="truncate font-medium">
                  {user.status ?? '-'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">KYC Status</span>
                <span className="truncate font-medium">
                  {user.kyc?.status ?? '-'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Subscription End</span>
                <span className="truncate font-medium">
                  {formatDate(user.subscriptionEnd)}
                </span>
              </div>
            </div>
          </div>
        )}
      </DetailSheet>
    </>
  )
}
