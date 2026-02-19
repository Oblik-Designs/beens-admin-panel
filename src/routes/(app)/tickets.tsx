import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import {
  CheckCircle2Icon,
  ChevronDownIcon,
  SlidersHorizontalIcon,
  UserIcon,
} from 'lucide-react'

import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from '@/components/ui/combobox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TicketActionSheet } from '@/components/ticket-action-sheet'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { TicketsTable } from '@/components/tickets-table'
import { searchTicketsOptions } from '@/queries/tickets'
import type { Ticket } from '@/server/api/tickets'
import { getUserByIdOptions, searchUserOptions } from '@/queries/users'
import type { UserSearchParams } from '@/server/api/users'
import type { TicketSearchParams } from '@/server/api/tickets'

export const ticketSearchSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  reporter: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  sortBy: z.enum(['priority']).default('priority'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

function searchToParams(
  search: z.infer<typeof ticketSearchSchema>,
): TicketSearchParams {
  const params: TicketSearchParams = {}

  if (search.page) params.page = search.page
  if (search.limit) params.limit = search.limit
  if (search.reporter) params.reporter = search.reporter
  if (search.type) params.type = search.type
  if (search.status) params.status = search.status
  if (search.priority) params.priority = search.priority
  params.sortBy = search.sortBy
  params.sortOrder = search.sortOrder

  return params
}

export const Route = createFileRoute('/(app)/tickets')({
  validateSearch: (search) => ticketSearchSchema.parse(search),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(
      searchTicketsOptions(searchToParams(deps)),
    ),
  component: TicketsPage,
})

function TicketsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const [userSearchInput, setUserSearchInput] = React.useState('')
  const [selectedReporterId, setSelectedReporterId] = React.useState<string>(
    search.reporter ?? '',
  )
  const [actionSheetOpen, setActionSheetOpen] = React.useState(false)
  const [selectedTicket, setSelectedTicket] = React.useState<Ticket | null>(
    null,
  )
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    setSelectedReporterId(search.reporter ?? '')
  }, [search.reporter])

  const apiParams = searchToParams(search)
  const { data, isLoading, isFetching } = useQuery(
    searchTicketsOptions(apiParams),
  )

  const { data: selectedReporterResponse } = useQuery({
    ...getUserByIdOptions(search.reporter ?? null),
    enabled: !!search.reporter,
  })

  React.useEffect(() => {
    if (!search.reporter || !selectedReporterResponse?.data) return
    const user: any = selectedReporterResponse.data
    const name =
      user.displayName ||
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() ||
      user.email ||
      'Unknown user'
    setUserSearchInput((prev) => (prev ? prev : name))
  }, [search.reporter, selectedReporterResponse])

  const userSearchParams: UserSearchParams | undefined = userSearchInput
    ? { query: userSearchInput, limit: 10 }
    : undefined

  const { data: userSearchData, isLoading: isUserSearchLoading } = useQuery({
    ...searchUserOptions(userSearchParams),
    enabled: !!userSearchParams?.query,
  })

  const tickets = (data?.data?.tickets as any[]) ?? []
  const pagination = data?.data?.pagination
  const totalTickets = pagination?.totalTickets ?? tickets.length
  const pageCount =
    pagination?.totalPages ??
    (search.limit > 0 ? Math.ceil(totalTickets / search.limit) : 1)
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

  const handleFilterChange = (patch: {
    type?: string | ''
    status?: string | ''
    priority?: string | ''
  }) => {
    navigate({
      search: (prev) => ({
        ...prev,
        page: 1,
        ...(patch.type !== undefined && { type: patch.type || undefined }),
        ...(patch.status !== undefined && {
          status: patch.status || undefined,
        }),
        ...(patch.priority !== undefined && {
          priority: patch.priority || undefined,
        }),
      }),
      replace: true,
    })
  }

  const handleReporterChange = (reporterId: string | null) => {
    setSelectedReporterId(reporterId ?? '')

    if (!reporterId) {
      setUserSearchInput('')
    } else {
      const user = userSearchData?.data?.users?.find(
        (u: any) => u._id === reporterId,
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
        reporter: reporterId || undefined,
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
        priority: undefined,
        reporter: undefined,
      }),
      replace: true,
    })
  }

  const handleViewTicketActions = React.useCallback((ticket: Ticket) => {
    setSelectedTicket(ticket)
    setActionSheetOpen(true)
  }, [])

  const handleActionSheetOpenChange = React.useCallback((open: boolean) => {
    setActionSheetOpen(open)
    if (!open) setSelectedTicket(null)
  }, [])

  console.log('tickets: ', tickets)

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
        <SiteHeader title="Tickets" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-1 flex-col gap-2 py-4 md:gap-4 md:py-6">
              <div className="flex flex-col gap-3 px-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
                {/* Reporter Combobox */}
                <div className="flex w-full max-w-sm items-center gap-2">
                  <Combobox
                    value={selectedReporterId || null}
                    onValueChange={(value) => handleReporterChange(value)}
                  >
                    <ComboboxInput
                      placeholder="Search reporter..."
                      className="h-8 w-95"
                      showClear
                      value={userSearchInput}
                      onChange={(event) => {
                        setUserSearchInput(event.target.value)
                      }}
                    />
                    <ComboboxContent>
                      <ComboboxList>
                        {!userSearchInput && (
                          <ComboboxEmpty className="text-muted-foreground text-xs">
                            Type to search reporters...
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
                              type: (value || '') as string | '',
                            })
                          }
                        >
                          <SelectTrigger className="h-8 w-full text-xs">
                            <SelectValue placeholder="All" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All</SelectItem>
                            <SelectItem value="REPORT_USER">
                              Report User
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
                              status: (value || '') as string | '',
                            })
                          }
                        >
                          <SelectTrigger className="h-8 w-full text-xs">
                            <SelectValue placeholder="All" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All</SelectItem>
                            <SelectItem value="OPEN">Open</SelectItem>
                            <SelectItem value="RESOLVED">Resolved</SelectItem>
                            <SelectItem value="CLOSED">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-medium text-muted-foreground">
                          Priority
                        </Label>
                        <Select
                          value={search.priority ?? ''}
                          onValueChange={(value) =>
                            handleFilterChange({
                              priority: (value || '') as string | '',
                            })
                          }
                        >
                          <SelectTrigger className="h-8 w-full text-xs">
                            <SelectValue placeholder="All" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All</SelectItem>
                            <SelectItem value="LOW">Low</SelectItem>
                            <SelectItem value="NORMAL">Normal</SelectItem>
                            <SelectItem value="HIGH">High</SelectItem>
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
                            !search.priority &&
                            !search.reporter
                          }
                        >
                          Clear filters
                        </Button>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {successMessage && (
                <div className="px-4 pb-2 lg:px-6">
                  <Alert variant="success" className="relative">
                    <CheckCircle2Icon className="size-4" />
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <AlertTitle>Action completed</AlertTitle>
                        <AlertDescription>{successMessage}</AlertDescription>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="-mr-2 -mt-1"
                        onClick={() => setSuccessMessage(null)}
                      >
                        ✕
                      </Button>
                    </div>
                  </Alert>
                </div>
              )}

              {!isLoading && (
                <>
                  <TicketsTable
                    data={tickets as any[]}
                    pageIndex={pageIndex}
                    pageSize={search.limit}
                    pageCount={pageCount}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                    onViewTicketActions={handleViewTicketActions}
                    isLoading={isFetching}
                  />
                  <TicketActionSheet
                    open={actionSheetOpen}
                    onOpenChange={handleActionSheetOpenChange}
                    ticket={selectedTicket}
                    onActionSuccess={(message) => setSuccessMessage(message)}
                  />
                </>
              )}

              {isLoading && (
                <div className="px-4 text-xs text-muted-foreground lg:px-6">
                  Loading tickets...
                </div>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
