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
import { UserTable } from '@/components/user-table'
import { searchUserOptions } from '@/queries/users'
import type { UserSearchParams } from '@/server/api/users'

export const userSearchSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  query: z.string().optional(),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  status: z.string().optional(),
  role: z.enum(['USER', 'ADMIN', 'MODERATOR']).default('USER'),
  gender: z.string().optional(),
  kycStatus: z.string().optional(),
})

function searchToParams(
  search: z.infer<typeof userSearchSchema>,
): UserSearchParams {
  const filter: UserSearchParams['filter'] = {}
  if (search.status) filter.status = search.status
  if (search.role) filter.role = search.role
  if (search.gender) filter.gender = search.gender
  if (search.kycStatus) filter.kycStatus = search.kycStatus
  return {
    query: search.query,
    page: search.page,
    limit: search.limit,
    sortBy: search.sortBy,
    sortOrder: search.sortOrder,
    ...(Object.keys(filter).length ? { filter } : {}),
  }
}

export const Route = createFileRoute('/(app)/users')({
  validateSearch: (search) => userSearchSchema.parse(search),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(
      searchUserOptions(searchToParams(deps)),
    ),
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
            page: 1,
          }),
          replace: true,
        })
      }, 400)
    },
    [navigate],
  )

  const apiParams = searchToParams(search)
  const { data, isLoading, isFetching } = useQuery(searchUserOptions(apiParams))

  const users = (data?.data?.users as any[]) ?? []
  const total = data?.data?.pagination?.totalUsers ?? 0
  const pageCount = search.limit > 0 ? Math.ceil(total / search.limit) : 1
  const pageIndex = search.page - 1

  const handlePageChange = (newPageIndex: number) => {
    navigate({
      search: (prev) => ({ ...prev, page: newPageIndex + 1 }),
      replace: true,
    })
  }

  const handlePageSizeChange = (newPageSize: number) => {
    navigate({
      search: (prev) => ({ ...prev, limit: newPageSize, page: 1 }),
      replace: true,
    })
  }

  const handleFilterChange = (patch: {
    status?: string
    role?: string
    gender?: string
    kycStatus?: string
    sortOrder?: 'asc' | 'desc'
  }) => {
    navigate({
      search: (prev) => ({
        ...prev,
        page: 1,
        ...(patch.status !== undefined && {
          status: patch.status || undefined,
        }),
        ...(patch.gender !== undefined && {
          gender: patch.gender || undefined,
        }),
        ...(patch.kycStatus !== undefined && {
          kycStatus: patch.kycStatus || undefined,
        }),
        ...(patch.sortOrder !== undefined && { sortOrder: patch.sortOrder }),
      }),
      replace: true,
    })
  }

  const handleClearFilters = () => {
    navigate({
      search: (prev) => ({
        ...prev,
        page: 1,
        status: undefined,
        role: 'USER',
        gender: undefined,
        kycStatus: undefined,
        sortOrder: 'asc',
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
        <SiteHeader title="Users" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="flex flex-col gap-3 px-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
                {/* Search Bar */}
                <div className="flex w-full max-w-sm items-center gap-2">
                  <SearchIcon className="text-muted-foreground size-4" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchInput}
                    onChange={(event) => applySearchInput(event.target.value)}
                    className="h-8"
                  />
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
                          Status
                        </Label>
                        <Select
                          value={search.status ?? ''}
                          onValueChange={(value) =>
                            handleFilterChange({ status: value ?? '' })
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
                            handleFilterChange({ gender: value ?? '' })
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
                          KYC status
                        </Label>
                        <Select
                          value={search.kycStatus ?? ''}
                          onValueChange={(value) =>
                            handleFilterChange({ kycStatus: value ?? '' })
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
                            handleFilterChange({
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
                          disabled={
                            !search.status &&
                            !search.gender &&
                            !search.kycStatus &&
                            search.sortOrder === 'asc'
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
                <UserTable
                  data={users as any[]}
                  pageIndex={pageIndex}
                  pageSize={search.limit}
                  pageCount={pageCount}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                  totalUsers={total}
                  isLoading={isFetching}
                />
              )}

              {isLoading && (
                <div className="px-4 text-xs text-muted-foreground lg:px-6">
                  Loading users...
                </div>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
