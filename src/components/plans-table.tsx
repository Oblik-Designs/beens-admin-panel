import type { Plan, PlanSortField } from '@/server/api/plans'
import { planColumns } from '@/constants/planDataColumns'
import { TableWithPagination } from '@/components/table-with-pagination'
import { Button } from '@/components/ui/button'

/**
 * Plans table.
 *
 * Row click navigates to the Plan 360 (`/plans/$planId`) which now owns
 * every per-plan side-panel previously rendered here: creator profile,
 * full plan details, participants, manage codes, and the suspend +
 * refund flow.
 */
type PlansTableProps = {
  data: Array<Plan>
  pageIndex: number
  pageSize: number
  pageCount: number
  onPageChange: (pageIndex: number) => void
  onPageSizeChange: (pageSize: number) => void
  isLoading?: boolean
  sortBy?: PlanSortField
  sortOrder?: 'asc' | 'desc'
  onSortChange?: (sortBy: PlanSortField, sortOrder: 'asc' | 'desc') => void
  onClearFilters?: () => void
  onRowClick?: (plan: Plan) => void
}

export function PlansTable({
  data,
  pageIndex,
  pageSize,
  pageCount,
  isLoading,
  onPageChange,
  onPageSizeChange,
  sortBy,
  sortOrder,
  onSortChange,
  onClearFilters,
  onRowClick,
}: PlansTableProps) {
  return (
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
        sortBy,
        sortOrder,
        onSortChange,
      }}
      onRowClick={onRowClick}
      emptyMessage="No plans match these filters."
      emptyAction={
        onClearFilters ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={onClearFilters}
          >
            Clear all filters
          </Button>
        ) : undefined
      }
      loadingMessage="Loading plans data..."
      isLoading={isLoading}
    />
  )
}
