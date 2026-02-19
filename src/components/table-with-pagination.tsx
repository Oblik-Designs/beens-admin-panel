'use client'

import * as React from 'react'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type TableMeta,
} from '@tanstack/react-table'

import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Label } from '@/components/ui/label'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from 'lucide-react'

export type TableWithPaginationMeta = {
  onViewUser?: (user: unknown) => void
  onViewTicketActions?: (ticket: unknown) => void
  onCreatorClick?: (userId: string) => void
  [key: string]: unknown
}

export type TableWithPaginationProps<TData> = {
  data: TData[]
  columns: ColumnDef<TData>[]
  getRowId: (row: TData) => string
  pageIndex: number
  pageSize: number
  pageCount: number
  onPageChange: (pageIndex: number) => void
  onPageSizeChange: (pageSize: number) => void
  meta?: TableMeta<TData>
  emptyMessage?: string
  loadingMessage?: string
  isLoading?: boolean
}

export function TableWithPagination<TData>({
  data: initialData,
  columns,
  getRowId,
  pageIndex,
  pageSize,
  pageCount,
  onPageChange,
  onPageSizeChange,
  meta,
  emptyMessage = 'No results found.',
  loadingMessage = 'Loading...',
  isLoading = false,
}: TableWithPaginationProps<TData>) {
  const [data, setData] = React.useState<TData[]>(() => initialData ?? [])

  React.useEffect(() => {
    setData(initialData ?? [])
  }, [initialData])

  const table = useReactTable({
    data,
    columns,
    state: {
      pagination: {
        pageIndex,
        pageSize,
      },
    },
    getRowId,
    manualPagination: true,
    pageCount,
    onPaginationChange: (updater) => {
      const newPagination =
        typeof updater === 'function'
          ? updater({ pageIndex, pageSize })
          : updater

      if (newPagination.pageSize !== pageSize) {
        onPageSizeChange(newPagination.pageSize)
      }
      if (newPagination.pageIndex !== pageIndex) {
        onPageChange(newPagination.pageIndex)
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    meta,
  })

  return (
    <div className="flex w-full flex-col gap-4 px-4 lg:px-6">
      <div className="overflow-hidden rounded-lg border relative">
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
            <div className="text-muted-foreground text-xs">
              {loadingMessage}
            </div>
          </div>
        )}
        <Table>
          <TableHeader className="bg-muted sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className={`first-of-type:px-6 ${
                      (header.column.columnDef.meta as { className?: string })
                        ?.className ?? ''
                    }`.trim()}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody className="**:data-[slot=table-cell]:first:w-8">
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={
                        (cell.column.columnDef.meta as { className?: string })
                          ?.className
                      }
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="h-24 text-center"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-4 lg:px-6">
        <div className="flex flex-1" />
        <div className="flex w-full items-center gap-6 lg:w-fit">
          <div className="hidden items-center gap-2 lg:flex">
            <Label htmlFor="rows-per-page" className="text-sm font-medium">
              Rows per page
            </Label>
            <select
              id="rows-per-page"
              className="border-input bg-background text-foreground focus-visible:ring-ring inline-flex h-8 w-20 items-center justify-between rounded-md border px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1"
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
            >
              {[10, 20, 30, 40, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeftIcon className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeftIcon className="size-4" />
            </Button>

            <div className="flex w-fit items-center justify-center text-sm font-medium">
              {table.getState().pagination.pageIndex + 1} of{' '}
              {table.getPageCount() || 1}
            </div>

            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRightIcon className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              onClick={() =>
                table.setPageIndex((pageCount ? pageCount : 1) - 1)
              }
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
