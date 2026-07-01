import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useInfiniteQuery } from '@tanstack/react-query'
import { z } from 'zod'

import {
  ChevronDownIcon,
  SearchIcon,
  SlidersHorizontalIcon,
} from 'lucide-react'

import type { UserSearchParams } from '@/server/api/users'
import type { FilterChip } from '@/components/admin/filter-chips'
import { FilterChips } from '@/components/admin/filter-chips'
import { ListMetaBar } from '@/components/admin/list-meta-bar'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Badge } from '@/components/ui/badge'
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
import { UserCardGrid } from '@/components/user-card-grid'
import { searchUsersInfiniteOptions } from '@/queries/users'

const userSearchSchema = z.object({
  query: z.string().optional(),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  status: z.string().optional(),
  role: z.enum(['USER', 'ADMIN', 'MODERATOR']).default('USER'),
  gender: z.string().optional(),
  kycStatus: z.string().optional(),
  elite: z.enum(['elite', 'non-elite']).optional(),
})

type UserSearch = z.infer<typeof userSearchSchema>

function usersSearchBase(search: UserSearch): Omit<UserSearchParams, 'page' | 'limit'> {
  const filter: UserSearchParams['filter'] = {}
  if (search.status) filter.status = search.status
  if (search.role) filter.role = search.role
  if (search.gender) filter.gender = search.gender
  if (search.kycStatus) filter.kycStatus = search.kycStatus
  if (search.elite === 'elite') filter.elite = true
  if (search.elite === 'non-elite') filter.elite = false
  return {
    query: search.query,
    sortBy: search.sortBy,
    sortOrder: search.sortOrder,
    ...(Object.keys(filter).length ? { filter } : {}),
  }
}

function countActiveFilters(search: UserSearch): number {
  let count = 0
  if (search.status) count++
  if (search.gender) count++
  if (search.kycStatus) count++
  if (search.elite) count++
  if (search.sortOrder !== 'asc') count++
  return count
}

function buildFilterChips(
  search: UserSearch,
  updateSearch: (patch: Partial<UserSearch>) => void,
): Array<FilterChip> {
  const chips: Array<FilterChip> = []

  if (search.query) {
    chips.push({
      id: 'query',
      label: `Search: ${search.query}`,
      onRemove: () => updateSearch({ query: undefined }),
    })
  }

  if (search.status) {
    chips.push({
      id: 'status',
      label: `Status: ${search.status}`,
      onRemove: () => updateSearch({ status: undefined }),
    })
  }

  if (search.gender) {
    chips.push({
      id: 'gender',
      label: `Gender: ${search.gender}`,
      onRemove: () => updateSearch({ gender: undefined }),
    })
  }

  if (search.kycStatus) {
    chips.push({
      id: 'kyc',
      label: `KYC: ${search.kycStatus}`,
      onRemove: () => updateSearch({ kycStatus: undefined }),
    })
  }

  if (search.elite) {
    chips.push({
      id: 'elite',
      label: search.elite === 'elite' ? 'Elite only' : 'Non-elite only',
      onRemove: () => updateSearch({ elite: undefined }),
    })
  }

  if (search.sortOrder !== 'asc') {
    chips.push({
      id: 'sort',
      label: `Sort: ${search.sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}`,
      onRemove: () => updateSearch({ sortOrder: 'asc' }),
    })
  }

  return chips
}

export const Route = createFileRoute('/(app)/users')({
  validateSearch: (search) => userSearchSchema.parse(search),
  component: UsersPage,
})

function UsersPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const [searchInput, setSearchInput] = React.useState(search.query ?? '')
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )

  React.useEffect(() => {
    setSearchInput(search.query ?? '')
  }, [search.query])

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

  const baseParams = React.useMemo(() => usersSearchBase(search), [search])

  const {
    data,
    isPending,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery(searchUsersInfiniteOptions(baseParams))

  const users = React.useMemo(
    () =>
      data?.pages.flatMap(
        (page) => (page.data?.users as Array<any> | undefined) ?? [],
      ) ?? [],
    [data],
  )

  const firstPage = data?.pages[0]?.data as
    | { total?: number; pagination?: { totalUsers?: number } }
    | undefined
  const total =
    firstPage?.total ?? firstPage?.pagination?.totalUsers ?? users.length
  const activeFilterCount = countActiveFilters(search)

  const updateSearch = React.useCallback(
    (patch: Partial<UserSearch>) => {
      navigate({
        search: (prev) => ({ ...prev, ...patch }),
        replace: true,
      })
    },
    [navigate],
  )

  const handleClearFilters = () => {
    setSearchInput('')
    navigate({
      search: {
        role: 'USER',
        sortBy: 'createdAt',
        sortOrder: 'asc',
      },
      replace: true,
    })
  }

  const filterChips = buildFilterChips(search, updateSearch)

  const filtersDisabled =
    activeFilterCount === 0 && !search.query

  const presets = [
    {
      label: 'Unverified',
      onClick: () => updateSearch({ status: 'UNVERIFIED' }),
    },
    {
      label: 'KYC pending',
      onClick: () => updateSearch({ kycStatus: 'PENDING' }),
    },
    {
      label: 'Elite',
      onClick: () => updateSearch({ elite: 'elite' }),
    },
  ]

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
        <SiteHeader title="Users" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="flex flex-col gap-3 px-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
                <div className="flex w-full max-w-sm items-center gap-2">
                  <SearchIcon className="text-muted-foreground size-4" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchInput}
                    onChange={(event) => applySearchInput(event.target.value)}
                    className="h-8"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="outline" size="sm" />}
                    >
                      <SlidersHorizontalIcon className="mr-2 size-4" />
                      Filters &amp; sort
                      {activeFilterCount > 0 && (
                        <Badge
                          variant="secondary"
                          className="ml-2 h-5 min-w-5 px-1.5 text-[10px]"
                        >
                          {activeFilterCount}
                        </Badge>
                      )}
                      <ChevronDownIcon className="ml-1 size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-64 space-y-3 p-3 text-xs"
                    >
                      <div className="space-y-1">
                        <Label className="text-[11px] font-medium text-muted-foreground">
                          Status
                        </Label>
                        <Select
                          value={search.status ?? ''}
                          onValueChange={(value) =>
                            updateSearch({ status: value || undefined })
                          }
                        >
                          <SelectTrigger className="h-8 w-full text-xs">
                            <SelectValue placeholder="All" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All</SelectItem>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="UNVERIFIED">
                              Unverified
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-medium text-muted-foreground">
                          Role
                        </Label>
                        <Select value={'USER'} disabled>
                          <SelectTrigger className="h-8 w-full text-xs">
                            <SelectValue placeholder="All" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                            <SelectItem value="USER">User</SelectItem>
                            <SelectItem value="MODERATOR">Moderator</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-medium text-muted-foreground">
                          Gender
                        </Label>
                        <Select
                          value={search.gender ?? ''}
                          onValueChange={(value) =>
                            updateSearch({ gender: value || undefined })
                          }
                        >
                          <SelectTrigger className="h-8 w-full text-xs">
                            <SelectValue placeholder="All" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All</SelectItem>
                            <SelectItem value="MALE">Male</SelectItem>
                            <SelectItem value="FEMALE">Female</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-medium text-muted-foreground">
                          Elite status
                        </Label>
                        <Select
                          value={search.elite ?? ''}
                          onValueChange={(value) =>
                            updateSearch({
                              elite:
                                value === 'elite' || value === 'non-elite'
                                  ? value
                                  : undefined,
                            })
                          }
                        >
                          <SelectTrigger className="h-8 w-full text-xs">
                            <SelectValue placeholder="All" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All</SelectItem>
                            <SelectItem value="elite">Elite only</SelectItem>
                            <SelectItem value="non-elite">
                              Non-elite only
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-medium text-muted-foreground">
                          KYC status
                        </Label>
                        <Select
                          value={search.kycStatus ?? ''}
                          onValueChange={(value) =>
                            updateSearch({ kycStatus: value || undefined })
                          }
                        >
                          <SelectTrigger className="h-8 w-full text-xs">
                            <SelectValue placeholder="All" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All</SelectItem>
                            <SelectItem value="NOT_STARTED">
                              Not started
                            </SelectItem>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="APPROVED">Approved</SelectItem>
                            <SelectItem value="REJECTED">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-medium text-muted-foreground">
                          Sort order
                        </Label>
                        <Select
                          value={search.sortOrder}
                          onValueChange={(value) =>
                            updateSearch({
                              sortOrder: (value as 'asc' | 'desc') ?? 'desc',
                            })
                          }
                        >
                          <SelectTrigger className="h-8 w-full text-xs">
                            <SelectValue placeholder="Newest first" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="desc">Newest first</SelectItem>
                            <SelectItem value="asc">Oldest first</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px]"
                          onClick={handleClearFilters}
                          disabled={filtersDisabled}
                        >
                          Clear all
                        </Button>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {filterChips.length > 0 && (
                <FilterChips chips={filterChips} className="px-4 lg:px-6" />
              )}

              <ListMetaBar
                total={total}
                loadedCount={isPending ? undefined : users.length}
                itemLabel="user"
                isLoading={isPending}
                presets={presets}
                onClearFilters={handleClearFilters}
                showClearWhenEmpty
              />

              <UserCardGrid
                users={users}
                total={total}
                isInitialLoading={isPending}
                isFetchingMore={isFetchingNextPage}
                hasMore={hasNextPage ?? false}
                onLoadMore={() => fetchNextPage()}
                onCardClick={(user) =>
                  navigate({
                    to: '/users/$userId',
                    params: { userId: user._id },
                  })
                }
              />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
