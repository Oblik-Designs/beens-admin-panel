'use client'

import * as React from 'react'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from 'lucide-react'
import type { ColumnDef, TableMeta } from '@tanstack/react-table'

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

export type TableWithPaginationProps<TData> = {
  data: Array<TData>
  columns: Array<ColumnDef<TData>>
  getRowId: (row: TData) => string
  pageIndex: number
  pageSize: number
  pageCount: number
  onPageChange: (pageIndex: number) => void
  onPageSizeChange: (pageSize: number) => void
  meta?: TableMeta<TData>
  emptyMessage?: string
  emptyAction?: React.ReactNode
  loadingMessage?: string
  isLoading?: boolean
  /**
   * When provided, clicking a row's non-interactive cells fires this
   * callback with the row data. Clicks originating from a button, link,
   * input, or any element with `[data-row-click-ignore]` are skipped so
   * existing cell-level actions (open-sheet buttons, dropdowns) are not
   * hijacked.
   */
  onRowClick?: (row: TData) => void
}

export function TableWithPagination<TData>({
  data,
  columns,
  getRowId,
  pageIndex,
  pageSize,
  pageCount,
  onPageChange,
  onPageSizeChange,
  meta,
  emptyMessage = 'No results found.',
  emptyAction,
  loadingMessage = 'Loading...',
  isLoading = false,
  onRowClick,
}: TableWithPaginationProps<TData>) {
  const safePageCount = Math.max(0, pageCount)

  const table = useReactTable({
    data: data ?? [],
    columns,
    state: {
      pagination: {
        pageIndex,
        pageSize,
      },
    },
    getRowId,
    manualPagination: true,
    pageCount: safePageCount,
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
                {headerGroup.headers.map((header) => {
                  const colMeta = header.column.columnDef.meta as
                    | { className?: string; sticky?: 'right' }
                    | undefined
                  const stickyClasses =
                    colMeta?.sticky === 'right'
                      ? 'sticky right-0 z-20 bg-muted shadow-[-6px_0_8px_-6px_rgba(0,0,0,0.12)]'
                      : ''
                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className={`first-of-type:px-6 ${stickyClasses} ${
                        colMeta?.className ?? ''
                      }`.trim()}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody className="**:data-[slot=table-cell]:first:w-8">
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={`group ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={
                    onRowClick
                      ? (event) => {
                          // Skip when the click came from an interactive
                          // element so existing cell buttons / dropdowns /
                          // links keep their original behavior.
                          const target = event.target as HTMLElement | null
                          if (
                            target?.closest(
                              'button, a, input, select, textarea, [role="menuitem"], [data-row-click-ignore]',
                            )
                          ) {
                            return
                          }
                          onRowClick(row.original)
                        }
                      : undefined
                  }
                >
                  {row.getVisibleCells().map((cell) => {
                    const colMeta = cell.column.columnDef.meta as
                      | { className?: string; sticky?: 'right' }
                      | undefined
                    const stickyClasses =
                      colMeta?.sticky === 'right'
                        ? 'sticky right-0 z-10 bg-background group-hover:bg-muted/50 shadow-[-6px_0_8px_-6px_rgba(0,0,0,0.08)]'
                        : ''
                    return (
                      <TableCell
                        key={cell.id}
                        className={`${stickyClasses} ${
                          colMeta?.className ?? ''
                        }`.trim()}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="h-24 text-center"
                >
                  <div className="flex flex-col items-center justify-center gap-1">
                    <span className="text-muted-foreground text-sm">
                      {emptyMessage}
                    </span>
                    {emptyAction}
                  </div>
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
              {Math.min(
                table.getState().pagination.pageIndex + 1,
                Math.max(safePageCount, 1),
              )}{' '}
              of {safePageCount || 1}
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
              onClick={() => table.setPageIndex(Math.max(safePageCount, 1) - 1)}
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
