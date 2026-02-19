import { ticketColumns } from '@/constants/ticketDataColumns'
import type { Ticket } from '@/server/api/tickets'
import { TableWithPagination } from '@/components/table-with-pagination'

type TicketsTableProps = {
  data: Ticket[]
  pageIndex: number
  pageSize: number
  pageCount: number
  onPageChange: (pageIndex: number) => void
  onPageSizeChange: (pageSize: number) => void
  onViewTicketActions?: (ticket: Ticket) => void
  isLoading?: boolean
}

export function TicketsTable({
  data,
  pageIndex,
  pageSize,
  pageCount,
  onPageChange,
  onPageSizeChange,
  onViewTicketActions,
  isLoading,
}: TicketsTableProps) {
  return (
    <TableWithPagination<Ticket>
      data={data}
      columns={ticketColumns}
      getRowId={(row) => row._id}
      pageIndex={pageIndex}
      pageSize={pageSize}
      pageCount={pageCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      meta={onViewTicketActions ? { onViewTicketActions } : undefined}
      emptyMessage="No tickets found."
      loadingMessage="Loading tickets data..."
      isLoading={isLoading}
    />
  )
}
