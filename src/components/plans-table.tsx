import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { CalendarIcon, MapPinIcon, UserIcon } from 'lucide-react'

import type { Plan } from '@/server/api/plans'
import { planColumns } from '@/constants/planDataColumns'
import { DetailSheet } from '@/components/detail-sheet'
import { TableWithPagination } from '@/components/table-with-pagination'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getUserByIdOptions } from '@/queries/users'
import { getPlanByIdOptions } from '@/queries/plans'

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
  data: Array<Plan>
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

  const [planSheetOpen, setPlanSheetOpen] = React.useState(false)
  const [selectedPlanId, setSelectedPlanId] = React.useState<string | null>(
    null,
  )

  const { data: userResponse, isLoading: isUserLoading } = useQuery({
    ...getUserByIdOptions(selectedCreatorId),
    enabled: sheetOpen && !!selectedCreatorId,
  })

  const user = (userResponse?.data as UserDetail | undefined) ?? null

  console.log('User Data: ', user)

  const { data: planResponse, isLoading: isPlanLoading } = useQuery({
    ...getPlanByIdOptions(selectedPlanId ?? ''),
    enabled: !!selectedPlanId,
  })

  const plan = (planResponse?.data ?? null) as any

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

  const handleViewPlan = React.useCallback((planId: string) => {
    setSelectedPlanId(planId)
    setPlanSheetOpen(true)
  }, [])

  const handlePlanSheetOpenChange = React.useCallback((open: boolean) => {
    setPlanSheetOpen(open)
    if (!open) {
      setSelectedPlanId(null)
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
        meta={{
          onCreatorClick: handleCreatorClick,
          onViewPlan: handleViewPlan,
        }}
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

      <DetailSheet
        open={planSheetOpen}
        onOpenChange={handlePlanSheetOpenChange}
        title="Plan details"
        description="View full information about this plan."
      >
        {!plan && isPlanLoading && (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            Loading plan details...
          </div>
        )}
        {!isPlanLoading && !plan && (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            No plan details found.
          </div>
        )}
        {!isPlanLoading && plan && (
          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <Avatar className="size-12">
                <AvatarImage
                  src={plan.creator?.profileImage}
                  alt={
                    plan.creator?.displayName ??
                    `${plan.creator?.firstName ?? ''} ${
                      plan.creator?.lastName ?? ''
                    }`.trim() ??
                    'Creator'
                  }
                />
                <AvatarFallback className="text-muted-foreground border">
                  <UserIcon className="size-6" />
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Creator
                </div>
                <div className="font-medium text-sm">
                  {plan.creator?.displayName ||
                    `${plan.creator?.firstName ?? ''} ${
                      plan.creator?.lastName ?? ''
                    }`.trim() ||
                    'Unknown'}
                </div>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border bg-muted/40 px-4 py-3">
              {Array.isArray(plan.images) && plan.images.length > 0 && (
                <div className="space-y-2">
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {plan.images
                      .filter((url: string | undefined) => !!url)
                      .map((url: string) => (
                        <img
                          key={url}
                          src={url}
                          alt={plan.title ?? 'Plan image'}
                          className="h-20 w-28 shrink-0 rounded-md object-cover"
                        />
                      ))}
                  </div>
                </div>
              )}
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Plan
              </div>
              <div className="space-y-1">
                <div className="font-semibold text-sm">{plan.title}</div>
                {plan.description && (
                  <p className="text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2 rounded-lg border bg-muted/40 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Location & schedule
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <MapPinIcon className="size-3 text-muted-foreground mt-1" />
                  <span>
                    {[
                      plan.location?.address,
                      plan.location?.city,
                      plan.location?.state,
                      plan.location?.country,
                      plan.location?.zipCode,
                    ]
                      .filter(Boolean)
                      .join(', ') || '-'}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="size-3 text-muted-foreground" />
                    <span className="text-xs">
                      Start:{' '}
                      {formatDate(plan.startDate) ?? plan.startDate ?? '-'}{' '}
                      {plan.startTime ? `at ${plan.startTime}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="size-3 text-muted-foreground" />
                    <span className="text-xs">
                      End: {formatDate(plan.endDate) ?? plan.endDate ?? '-'}{' '}
                      {plan.endTime ? `at ${plan.endTime}` : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border bg-muted/40 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Overview
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium">{plan.type ?? '-'}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Privacy</span>
                  <span className="font-medium">{plan.privacy ?? '-'}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium">{plan.status ?? '-'}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Budget</span>
                  <span className="font-medium">
                    {plan.budget?.amount
                      ? `${plan.budget.amount} ${
                          plan.budget.currency?.toUpperCase() ?? ''
                        }`
                      : '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </DetailSheet>
    </>
  )
}
