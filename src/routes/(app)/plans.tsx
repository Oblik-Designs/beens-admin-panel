import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import {
  ChevronDownIcon,
  SearchIcon,
  SlidersHorizontalIcon,
} from 'lucide-react'

import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from '@/components/ui/combobox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { UserIcon } from 'lucide-react'
import { PlansTable } from '@/components/plans-table'
import { searchPlansOptions } from '@/queries/plans'
import { getUserByIdOptions, searchUserOptions } from '@/queries/users'
import type { UserSearchParams } from '@/server/api/users'
import type {
  PlanSearchParams,
  PlanStatusFilter,
  PlanTypeFilter,
} from '@/server/api/plans'

export const planSearchSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  query: z.string().optional(),
  type: z.enum(['Pay to Join', 'Join to Earn', 'Bid to Join']).optional(),
  status: z
    .enum([
      'Draft',
      'Active',
      'In Progress',
      'Completed',
      'Cancelled',
      'Suspended',
    ])
    .optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  creator: z.string().optional(),
})

function searchToParams(
  search: z.infer<typeof planSearchSchema>,
): PlanSearchParams {
  const params: PlanSearchParams = {}

  if (search.page) params.page = search.page
  if (search.limit) params.limit = search.limit
  if (search.query) params.query = search.query
  if (search.type) params.type = search.type as PlanTypeFilter
  if (search.creator) params.creator = search.creator
  if (search.status) params.status = search.status as PlanStatusFilter
  if (search.startDate) params.startDate = search.startDate
  if (search.endDate) params.endDate = search.endDate

  return params
}

export const Route = createFileRoute('/(app)/plans')({
  validateSearch: (search) => planSearchSchema.parse(search),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(
      searchPlansOptions(searchToParams(deps)),
    ),
  component: PlansPage,
})

function PlansPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const [searchInput, setSearchInput] = React.useState(search.query ?? '')
  const [userSearchInput, setUserSearchInput] = React.useState('')
  const [selectedCreatorId, setSelectedCreatorId] = React.useState<string>(
    search.creator ?? '',
  )
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )

  React.useEffect(() => {
    setSearchInput(search.query ?? '')
  }, [search.query])

  React.useEffect(() => {
    setSelectedCreatorId(search.creator ?? '')
  }, [search.creator])

  const applySearchInput = React.useCallback(
    (value: string) => {
      setSearchInput(value)
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        navigate({
          search: (prev) => ({
            ...prev,
            query: value || undefined,
          }),
          replace: true,
        })
      }, 400)
    },
    [navigate],
  )

  const apiParams = searchToParams(search)
  const { data, isLoading, isFetching } = useQuery(
    searchPlansOptions(apiParams),
  )

  // When landing on this page with a creator id in the URL (e.g. from Users table),
  // fetch that creator's details once and use their name as the combobox display value.
  const { data: selectedCreatorResponse } = useQuery({
    ...getUserByIdOptions(search.creator ?? null),
    enabled: !!search.creator,
  })

  React.useEffect(() => {
    if (!search.creator || !selectedCreatorResponse?.data) return
    const user: any = selectedCreatorResponse.data
    const name =
      user.displayName ||
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() ||
      user.email ||
      'Unknown user'
    // Only set if input is currently empty, so we don't override manual edits
    setUserSearchInput((prev) => (prev ? prev : name))
  }, [search.creator, selectedCreatorResponse])

  const userSearchParams: UserSearchParams | undefined = userSearchInput
    ? {
        query: userSearchInput,
        limit: 10,
      }
    : undefined

  const { data: userSearchData, isLoading: isUserSearchLoading } = useQuery({
    ...searchUserOptions(userSearchParams),
    enabled: !!userSearchParams?.query,
  })

  const plans = (data?.data?.plans as any[]) ?? []
  const pagination = data?.data?.pagination
  const totalPlans = pagination?.totalPlans ?? plans.length
  const pageCount =
    pagination?.totalPages ??
    (search.limit > 0 ? Math.ceil(totalPlans / search.limit) : 1)
  const pageIndex = pagination?.page ? pagination.page - 1 : 0

  const handlePageChange = (newPageIndex: number) => {
    navigate({
      search: (prev) => ({
        ...prev,
        page: newPageIndex + 1,
      }),
      replace: true,
    })
  }

  const handlePageSizeChange = (newPageSize: number) => {
    navigate({
      search: (prev) => ({
        ...prev,
        limit: newPageSize,
        page: 1,
      }),
      replace: true,
    })
  }

  const handleCreatorChange = (creatorId: string | null) => {
    setSelectedCreatorId(creatorId ?? '')

    if (!creatorId) {
      setUserSearchInput('')
    } else {
      const user = userSearchData?.data?.users?.find(
        (u: any) => u._id === creatorId,
      )
      if (user) {
        const name =
          user.displayName ||
          `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() ||
          user.email ||
          'Unknown user'
        setUserSearchInput(name)
      }
    }
    navigate({
      search: (prev) => ({
        ...prev,
        page: 1,
        creator: creatorId || undefined,
      }),
      replace: true,
    })
  }

  const handleFilterChange = (patch: {
    type?: PlanTypeFilter | ''
    status?: PlanStatusFilter | ''
    startDate?: string
    endDate?: string
  }) => {
    navigate({
      search: (prev) => ({
        ...prev,
        page: 1,
        ...(patch.type !== undefined && { type: patch.type || undefined }),
        ...(patch.status !== undefined && {
          status: patch.status || undefined,
        }),
        ...(patch.startDate !== undefined && {
          startDate: patch.startDate || undefined,
        }),
        ...(patch.endDate !== undefined && {
          endDate: patch.endDate || undefined,
        }),
      }),
      replace: true,
    })
  }

  const handleClearFilters = () => {
    navigate({
      search: (prev) => ({
        ...prev,
        page: 1,
        type: undefined,
        status: undefined,
        startDate: undefined,
        endDate: undefined,
        creator: undefined,
      }),
      replace: true,
    })
  }

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Plans" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="flex flex-col gap-3 px-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
                {/* Search Bar */}
                <div className="flex w-full max-w-sm items-center gap-2">
                  <SearchIcon className="text-muted-foreground size-8" />
                  <Input
                    placeholder="Search plans..."
                    value={searchInput}
                    onChange={(event) => applySearchInput(event.target.value)}
                    className="h-8"
                  />
                  <Combobox
                    value={selectedCreatorId || null}
                    onValueChange={(value) => handleCreatorChange(value)}
                  >
                    <ComboboxInput
                      placeholder="Search users..."
                      className="h-8 w-95"
                      showClear
                      value={userSearchInput}
                      onChange={(event) => {
                        const value = event.target.value
                        setUserSearchInput(value)
                      }}
                    />
                    <ComboboxContent>
                      <ComboboxList>
                        {!userSearchInput && (
                          <ComboboxEmpty className="text-muted-foreground text-xs">
                            Type to search users...
                          </ComboboxEmpty>
                        )}
                        {isUserSearchLoading && (
                          <ComboboxItem value="loading" disabled>
                            Searching users...
                          </ComboboxItem>
                        )}
                        {userSearchData?.data?.users?.map((user: any) => {
                          const name =
                            user.displayName ||
                            `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() ||
                            'Unknown user'
                          return (
                            <ComboboxItem key={user._id} value={user._id}>
                              <div className="flex items-center gap-2">
                                <Avatar className="size-6">
                                  <AvatarImage
                                    src={user.profileImage}
                                    alt={name}
                                  />
                                  <AvatarFallback className="text-muted-foreground bg-transparent border">
                                    <UserIcon className="size-3" />
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate">{name}</span>
                              </div>
                            </ComboboxItem>
                          )
                        })}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="outline" size="sm" />}
                    >
                      <SlidersHorizontalIcon className="mr-2 size-4" />
                      Filters
                      <ChevronDownIcon className="ml-1 size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-64 space-y-3 p-3 text-xs"
                    >
                      <div className="space-y-1">
                        <Label className="text-[11px] font-medium text-muted-foreground">
                          Type
                        </Label>
                        <Select
                          value={search.type ?? ''}
                          onValueChange={(value) =>
                            handleFilterChange({
                              type: (value || '') as PlanTypeFilter | '',
                            })
                          }
                        >
                          <SelectTrigger className="h-8 w-full text-xs">
                            <SelectValue placeholder="All" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All</SelectItem>
                            <SelectItem value="Pay to Join">
                              Pay to Join
                            </SelectItem>
                            <SelectItem value="Join to Earn">
                              Join to Earn
                            </SelectItem>
                            <SelectItem value="Bid to Join">
                              Bid to Join
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-medium text-muted-foreground">
                          Status
                        </Label>
                        <Select
                          value={search.status ?? ''}
                          onValueChange={(value) =>
                            handleFilterChange({
                              status: (value || '') as PlanStatusFilter | '',
                            })
                          }
                        >
                          <SelectTrigger className="h-8 w-full text-xs">
                            <SelectValue placeholder="All" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All</SelectItem>
                            <SelectItem value="Draft">Draft</SelectItem>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="In Progress">
                              In Progress
                            </SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                            <SelectItem value="Cancelled">Cancelled</SelectItem>
                            <SelectItem value="Suspended">Suspended</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex justify-end pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px]"
                          onClick={handleClearFilters}
                          disabled={
                            !search.type &&
                            !search.status &&
                            !search.startDate &&
                            !search.endDate
                          }
                        >
                          Clear filters
                        </Button>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {!isLoading && (
                <PlansTable
                  data={plans as any[]}
                  pageIndex={pageIndex}
                  pageSize={search.limit}
                  pageCount={pageCount}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                  isLoading={isFetching}
                />
              )}

              {isLoading && (
                <div className="px-4 text-xs text-muted-foreground lg:px-6">
                  Loading plans...
                </div>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
