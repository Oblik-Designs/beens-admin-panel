import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import {
  ChevronDownIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  UserIcon,
} from 'lucide-react'

import type { UserSearchParams } from '@/server/api/users'
import type {
  PlanCategory,
  PlanKindFilter,
  PlanReportFilter,
  PlanSearchParams,
  PlanSortField,
  PlanStatusFilter,
  PlanTypeFilter,
} from '@/server/api/plans'
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
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MultiFilterGroup } from '@/components/multi-filter-group'
import { PlanCardGrid } from '@/components/plan-card-grid'
import {
  parseMultiSearchParam,
  serializeMultiSearchParam,
} from '@/lib/multi-search-param'
import { getPlanCategoriesOptions, searchPlansInfiniteOptions } from '@/queries/plans'
import { getUserByIdOptions, searchUserOptions } from '@/queries/users'

const PLAN_TYPE_VALUES = [
  'Pay to Join',
  'Join to Earn',
  'Bid to Join',
] as const

const PLAN_STATUS_VALUES = [
  'Draft',
  'Active',
  'In Progress',
  'Completed',
  'Cancelled',
  'Suspended',
] as const

const PLAN_KIND_VALUES = ['one-off', 'recurring', 'instances'] as const

const PLAN_REPORT_VALUES = ['has', 'no'] as const

const TYPE_OPTIONS = PLAN_TYPE_VALUES.map((value) => ({
  value,
  label: value,
}))

const STATUS_OPTIONS = PLAN_STATUS_VALUES.map((value) => ({
  value,
  label: value,
}))

const PLAN_KIND_OPTIONS: Array<{ value: PlanKindFilter; label: string }> = [
  { value: 'one-off', label: 'One-off' },
  { value: 'recurring', label: 'Recurring templates' },
  { value: 'instances', label: 'Slot instances' },
]

const REPORT_OPTIONS: Array<{ value: PlanReportFilter; label: string }> = [
  { value: 'has', label: 'Has reports' },
  { value: 'no', label: 'No reports' },
]

const planSearchSchema = z
  .object({
    query: z.string().optional(),
    type: z.union([z.string(), z.array(z.string())]).optional(),
    status: z.union([z.string(), z.array(z.string())]).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    createdFrom: z.string().optional(),
    createdTo: z.string().optional(),
    creator: z.string().optional(),
    categoryId: z.coerce.number().optional(),
    planKinds: z.union([z.string(), z.array(z.string())]).optional(),
    /** @deprecated use planKinds */
    planKind: z.enum(['all', 'one-off', 'recurring', 'instances']).optional(),
    /** @deprecated use planKinds=instances */
    showInstances: z.boolean().optional(),
    reports: z.union([z.string(), z.array(z.string())]).optional(),
    duplicateSlots: z.coerce.boolean().optional(),
    /** @deprecated use reports=has|no */
    hasReports: z.enum(['true', 'false']).optional(),
    sortBy: z
      .enum([
        'createdAt',
        'updatedAt',
        'startDate',
        'endDate',
        'title',
        'status',
        'views',
      ])
      .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .transform((search) => {
    const legacyPlanKinds: Array<PlanKindFilter> = []
    if (search.planKind && search.planKind !== 'all') {
      legacyPlanKinds.push(search.planKind as PlanKindFilter)
    } else if (search.showInstances) {
      legacyPlanKinds.push('instances')
    }

    const legacyReports: Array<PlanReportFilter> = []
    if (search.hasReports === 'true') legacyReports.push('has')
    if (search.hasReports === 'false') legacyReports.push('no')

    const {
      planKind: _planKind,
      showInstances: _showInstances,
      hasReports: _hasReports,
      type,
      status,
      planKinds,
      reports,
      ...rest
    } = search

    return {
      ...rest,
      type: parseMultiSearchParam(type, PLAN_TYPE_VALUES),
      status: parseMultiSearchParam(status, PLAN_STATUS_VALUES),
      planKinds:
        parseMultiSearchParam(planKinds, PLAN_KIND_VALUES).length > 0
          ? parseMultiSearchParam(planKinds, PLAN_KIND_VALUES)
          : legacyPlanKinds,
      reports:
        parseMultiSearchParam(reports, PLAN_REPORT_VALUES).length > 0
          ? parseMultiSearchParam(reports, PLAN_REPORT_VALUES)
          : legacyReports,
    }
  })

type PlanSearch = z.infer<typeof planSearchSchema>

function plansSearchBase(search: PlanSearch): Omit<PlanSearchParams, 'page' | 'limit'> {
  const params: Omit<PlanSearchParams, 'page' | 'limit'> = {}

  if (search.query) params.query = search.query
  if (search.type.length) params.type = search.type as Array<PlanTypeFilter>
  if (search.creator) params.creator = search.creator
  if (search.status.length) params.status = search.status as Array<PlanStatusFilter>
  if (search.startDate) params.startDate = search.startDate
  if (search.endDate) params.endDate = search.endDate
  if (search.categoryId) params.categoryId = search.categoryId
  if (search.createdFrom) params.createdFrom = search.createdFrom
  if (search.createdTo) params.createdTo = search.createdTo
  if (search.sortBy) params.sortBy = search.sortBy as PlanSortField
  if (search.sortOrder) params.sortOrder = search.sortOrder

  if (search.planKinds.length) {
    params.planKinds = search.planKinds
  } else {
    params.excludeInstances = true
  }

  if (search.reports.length === 1) {
    params.hasReports = search.reports[0] === 'has'
  }

  if (search.duplicateSlots) params.duplicateSlots = true

  return params
}

function countActiveFilters(search: PlanSearch): number {
  let count = 0
  if (search.type.length) count++
  if (search.status.length) count++
  if (search.startDate) count++
  if (search.endDate) count++
  if (search.createdFrom) count++
  if (search.createdTo) count++
  if (search.creator) count++
  if (search.categoryId) count++
  if (search.planKinds.length) count++
  if (search.reports.length === 1) count++
  if (search.duplicateSlots) count++
  if (search.sortBy !== 'createdAt' || search.sortOrder !== 'desc') count++
  return count
}

function buildFilterChips(
  search: PlanSearch,
  creatorName: string | undefined,
  categoryName: string | undefined,
  updateSearch: (patch: Partial<PlanSearch>) => void,
): Array<FilterChip> {
  const chips: Array<FilterChip> = []

  if (search.query) {
    chips.push({
      id: 'query',
      label: `Search: ${search.query}`,
      onRemove: () => updateSearch({ query: undefined }),
    })
  }

  if (search.creator) {
    chips.push({
      id: 'creator',
      label: `Creator: ${creatorName ?? search.creator}`,
      onRemove: () => updateSearch({ creator: undefined }),
    })
  }

  for (const status of search.status) {
    chips.push({
      id: `status-${status}`,
      label: `Status: ${status}`,
      onRemove: () =>
        updateSearch({
          status: search.status.filter((value) => value !== status),
        }),
    })
  }

  for (const type of search.type) {
    chips.push({
      id: `type-${type}`,
      label: `Type: ${type}`,
      onRemove: () =>
        updateSearch({
          type: search.type.filter((value) => value !== type),
        }),
    })
  }

  for (const kind of search.planKinds) {
    chips.push({
      id: `kind-${kind}`,
      label: `Kind: ${kind}`,
      onRemove: () =>
        updateSearch({
          planKinds: search.planKinds.filter((value) => value !== kind),
        }),
    })
  }

  for (const report of search.reports) {
    chips.push({
      id: `report-${report}`,
      label: report === 'has' ? 'Has reports' : 'No reports',
      onRemove: () =>
        updateSearch({
          reports: search.reports.filter((value) => value !== report),
        }),
    })
  }

  if (search.duplicateSlots) {
    chips.push({
      id: 'duplicateSlots',
      label: 'Duplicate slots',
      onRemove: () => updateSearch({ duplicateSlots: undefined }),
    })
  }

  if (search.categoryId) {
    chips.push({
      id: 'categoryId',
      label: `Category: ${categoryName ?? search.categoryId}`,
      onRemove: () => updateSearch({ categoryId: undefined }),
    })
  }

  if (search.startDate) {
    chips.push({
      id: 'startDate',
      label: `Start from ${search.startDate}`,
      onRemove: () => updateSearch({ startDate: undefined }),
    })
  }

  if (search.endDate) {
    chips.push({
      id: 'endDate',
      label: `Start to ${search.endDate}`,
      onRemove: () => updateSearch({ endDate: undefined }),
    })
  }

  if (search.createdFrom) {
    chips.push({
      id: 'createdFrom',
      label: `Created from ${search.createdFrom}`,
      onRemove: () => updateSearch({ createdFrom: undefined }),
    })
  }

  if (search.createdTo) {
    chips.push({
      id: 'createdTo',
      label: `Created to ${search.createdTo}`,
      onRemove: () => updateSearch({ createdTo: undefined }),
    })
  }

  if (search.sortBy !== 'createdAt' || search.sortOrder !== 'desc') {
    chips.push({
      id: 'sort',
      label: `Sort: ${search.sortBy} (${search.sortOrder})`,
      onRemove: () =>
        updateSearch({ sortBy: 'createdAt', sortOrder: 'desc' }),
    })
  }

  return chips
}

/** Strip empty multi-select values before Zod runs (e.g. legacy `type=[]` URLs). */
function normalizePlanSearchInput(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw
  const input = { ...(raw as Record<string, unknown>) }
  for (const key of ['type', 'status', 'planKinds', 'reports'] as const) {
    const value = input[key]
    if (
      value === undefined ||
      value === null ||
      value === '' ||
      value === '[]'
    ) {
      delete input[key]
      continue
    }
    if (Array.isArray(value) && value.length === 0) {
      delete input[key]
    }
  }
  return input
}

/** URL-safe search params — never writes empty arrays like `type=[]`.
 *  Return is the URL-encoded form (arrays joined to strings); TanStack's
 *  `validateSearch` re-parses it back into a real `PlanSearch` at navigation
 *  time, so the cast at the return is the documented round-trip. */
function planSearchToUrl(
  search: Partial<PlanSearch> & {
    sortBy?: PlanSearch['sortBy']
    sortOrder?: PlanSearch['sortOrder']
  },
): PlanSearch {
  const url: Record<string, string | number | boolean> = {
    sortBy: search.sortBy ?? 'createdAt',
    sortOrder: search.sortOrder ?? 'desc',
  }

  if (search.query) url.query = search.query
  if (search.creator) url.creator = search.creator
  if (search.startDate) url.startDate = search.startDate
  if (search.endDate) url.endDate = search.endDate
  if (search.createdFrom) url.createdFrom = search.createdFrom
  if (search.createdTo) url.createdTo = search.createdTo
  if (search.categoryId) url.categoryId = search.categoryId
  if (search.duplicateSlots) url.duplicateSlots = true

  const type = serializeMultiSearchParam(search.type ?? [])
  const status = serializeMultiSearchParam(search.status ?? [])
  const planKinds = serializeMultiSearchParam(search.planKinds ?? [])
  const reports = serializeMultiSearchParam(search.reports ?? [])

  if (type) url.type = type
  if (status) url.status = status
  if (planKinds) url.planKinds = planKinds
  if (reports) url.reports = reports

  return url as unknown as PlanSearch
}

export const Route = createFileRoute('/(app)/plans')({
  validateSearch: (search) =>
    planSearchSchema.parse(normalizePlanSearchInput(search)),
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
          search: (prev) =>
            planSearchToUrl({
              ...prev,
              query: value || undefined,
            }),
          replace: true,
        })
      }, 400)
    },
    [navigate],
  )

  const baseParams = React.useMemo(() => plansSearchBase(search), [search])

  const {
    data,
    isPending,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery(searchPlansInfiniteOptions(baseParams))

  const plans = React.useMemo(
    () =>
      data?.pages.flatMap(
        (page) => (page.data?.plans as Array<any> | undefined) ?? [],
      ) ?? [],
    [data],
  )

  const totalPlans =
    data?.pages[0]?.data?.pagination?.totalItems ?? plans.length
  const activeFilterCount = countActiveFilters(search)

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

  const {
    data: categoriesData,
    isLoading: isCategoriesLoading,
    isError: isCategoriesError,
  } = useQuery(getPlanCategoriesOptions())

  const categories: Array<PlanCategory> =
    categoriesData?.data?.categories?.filter(
      (cat) => cat.status !== 'DISABLED',
    ) ?? []

  const selectedCategoryName = search.categoryId
    ? categories.find((cat) => cat.id === search.categoryId)?.name
    : undefined

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
      search: (prev) =>
        planSearchToUrl({
          ...prev,
          creator: creatorId || undefined,
        }),
      replace: true,
    })
  }

  const updateSearch = React.useCallback(
    (patch: Partial<PlanSearch>) => {
      navigate({
        search: (prev) => planSearchToUrl({ ...prev, ...patch }),
        replace: true,
      })
    },
    [navigate],
  )

  const handleClearFilters = () => {
    setSearchInput('')
    setUserSearchInput('')
    setSelectedCreatorId('')
    navigate({
      search: planSearchToUrl({
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
      replace: true,
    })
  }

  const filtersDisabled =
    activeFilterCount === 0 && !search.query && !search.creator

  const creatorDisplayName =
    selectedCreatorResponse?.data?.displayName ||
    [
      selectedCreatorResponse?.data?.firstName,
      selectedCreatorResponse?.data?.lastName,
    ]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    userSearchInput ||
    undefined

  const filterChips = buildFilterChips(
    search,
    creatorDisplayName,
    selectedCategoryName,
    updateSearch,
  )

  const presets = [
    {
      label: 'Needs review',
      onClick: () =>
        updateSearch({
          status: ['Active'],
          reports: ['has'],
          duplicateSlots: undefined,
        }),
    },
    {
      label: 'Recurring templates',
      onClick: () =>
        updateSearch({
          planKinds: ['recurring'],
          duplicateSlots: undefined,
        }),
    },
    {
      label: 'Suspended',
      onClick: () =>
        updateSearch({
          status: ['Suspended'],
          duplicateSlots: undefined,
        }),
    },
    {
      label: 'Duplicate slots',
      onClick: () =>
        updateSearch({
          duplicateSlots: true,
          planKinds: ['instances'],
        }),
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
        <SiteHeader title="Plans" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="flex flex-col gap-3 px-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
                <div className="flex w-full max-w-3xl flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex flex-1 items-center gap-2">
                    <SearchIcon className="text-muted-foreground size-4 shrink-0" />
                    <Input
                      placeholder="Search title or description..."
                      value={searchInput}
                      onChange={(event) => applySearchInput(event.target.value)}
                      className="h-8"
                    />
                  </div>
                  <Combobox
                    value={selectedCreatorId || null}
                    onValueChange={(value) => handleCreatorChange(value)}
                  >
                    <ComboboxInput
                      placeholder="Filter by creator..."
                      className="h-8 w-full sm:w-56"
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
                      className="max-h-[min(80vh,720px)] w-80 space-y-3 overflow-y-auto p-3 text-xs"
                    >
                      <div className="space-y-1">
                        <Label className="text-[11px] font-medium text-muted-foreground">
                          Sort by
                        </Label>
                        <Select
                          value={search.sortBy}
                          onValueChange={(value) =>
                            updateSearch({ sortBy: value as PlanSortField })
                          }
                        >
                          <SelectTrigger className="h-8 w-full text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="createdAt">Created</SelectItem>
                            <SelectItem value="updatedAt">Updated</SelectItem>
                            <SelectItem value="startDate">
                              Start date
                            </SelectItem>
                            <SelectItem value="endDate">End date</SelectItem>
                            <SelectItem value="title">Title</SelectItem>
                            <SelectItem value="status">Status</SelectItem>
                            <SelectItem value="views">Views</SelectItem>
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
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="desc">
                              {search.sortBy === 'title' ||
                              search.sortBy === 'status'
                                ? 'Z → A / descending'
                                : 'Newest / highest first'}
                            </SelectItem>
                            <SelectItem value="asc">
                              {search.sortBy === 'title' ||
                              search.sortBy === 'status'
                                ? 'A → Z / ascending'
                                : 'Oldest / lowest first'}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-medium text-muted-foreground">
                          Category
                        </Label>
                        <Select
                          value={search.categoryId?.toString() ?? ''}
                          onValueChange={(value) =>
                            updateSearch({
                              categoryId: value ? Number(value) : undefined,
                            })
                          }
                          disabled={isCategoriesLoading || isCategoriesError}
                        >
                          <SelectTrigger className="h-8 w-full text-xs">
                            <SelectValue
                              placeholder={
                                isCategoriesLoading
                                  ? 'Loading categories...'
                                  : isCategoriesError
                                    ? 'Failed to load categories'
                                    : 'All'
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All</SelectItem>
                            {categories.map((cat) => (
                              <SelectItem
                                key={cat.id}
                                value={cat.id.toString()}
                              >
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {isCategoriesError && (
                          <p className="text-[10px] text-destructive leading-snug">
                            Could not load categories. Try reloading the page.
                          </p>
                        )}
                        {!isCategoriesLoading &&
                          !isCategoriesError &&
                          categories.length === 0 && (
                            <p className="text-[10px] text-muted-foreground leading-snug">
                              No categories available.
                            </p>
                          )}
                      </div>

                      <MultiFilterGroup
                        label="Status"
                        options={STATUS_OPTIONS}
                        selected={search.status}
                        onChange={(status) => updateSearch({ status })}
                      />

                      <MultiFilterGroup
                        label="Type"
                        options={TYPE_OPTIONS}
                        selected={search.type}
                        onChange={(type) => updateSearch({ type })}
                      />

                      <MultiFilterGroup
                        label="Plan kind"
                        options={PLAN_KIND_OPTIONS}
                        selected={search.planKinds}
                        onChange={(planKinds) => updateSearch({ planKinds })}
                      />

                      <MultiFilterGroup
                        label="Reports"
                        options={REPORT_OPTIONS}
                        selected={search.reports}
                        onChange={(reports) => updateSearch({ reports })}
                      />

                      <label className="flex cursor-pointer items-center gap-2 rounded-md border bg-muted/30 px-2 py-1.5">
                        <input
                          type="checkbox"
                          className="size-3.5 accent-primary"
                          checked={!!search.duplicateSlots}
                          onChange={(event) =>
                            updateSearch({
                              duplicateSlots: event.target.checked || undefined,
                            })
                          }
                        />
                        <span className="text-xs">Duplicate slot instances only</span>
                      </label>

                      <p className="text-[10px] text-muted-foreground leading-snug">
                        Leave plan kind empty to show templates and one-offs
                        (slot instances hidden). Select multiple values within a
                        group to match any of them.
                      </p>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-medium text-muted-foreground">
                            Start from
                          </Label>
                          <Input
                            type="date"
                            className="h-8 text-xs"
                            value={search.startDate ?? ''}
                            onChange={(event) =>
                              updateSearch({
                                startDate: event.target.value || undefined,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-medium text-muted-foreground">
                            Start to
                          </Label>
                          <Input
                            type="date"
                            className="h-8 text-xs"
                            value={search.endDate ?? ''}
                            onChange={(event) =>
                              updateSearch({
                                endDate: event.target.value || undefined,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-medium text-muted-foreground">
                            Created from
                          </Label>
                          <Input
                            type="date"
                            className="h-8 text-xs"
                            value={search.createdFrom ?? ''}
                            onChange={(event) =>
                              updateSearch({
                                createdFrom: event.target.value || undefined,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-medium text-muted-foreground">
                            Created to
                          </Label>
                          <Input
                            type="date"
                            className="h-8 text-xs"
                            value={search.createdTo ?? ''}
                            onChange={(event) =>
                              updateSearch({
                                createdTo: event.target.value || undefined,
                              })
                            }
                          />
                        </div>
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
                <FilterChips
                  chips={filterChips}
                  className="px-4 lg:px-6"
                />
              )}

              <ListMetaBar
                total={totalPlans}
                loadedCount={isPending ? undefined : plans.length}
                itemLabel="plan"
                isLoading={isPending}
                presets={presets}
                onClearFilters={handleClearFilters}
                showClearWhenEmpty
              />

              <PlanCardGrid
                plans={plans}
                total={totalPlans}
                isInitialLoading={isPending}
                isFetchingMore={isFetchingNextPage}
                hasMore={hasNextPage ?? false}
                onLoadMore={() => fetchNextPage()}
                onClearFilters={handleClearFilters}
                onCardClick={(plan) =>
                  navigate({
                    to: '/plans/$planId',
                    params: { planId: plan._id },
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
