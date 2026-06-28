'use client'

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from 'lucide-react'

import type { User } from '@/constants/userDataColumns'
import { UserCard } from '@/components/user-card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

type UserCardGridProps = {
  data: Array<User>
  pageIndex: number
  pageSize: number
  pageCount: number
  onPageChange: (pageIndex: number) => void
  onPageSizeChange: (pageSize: number) => void
  isLoading?: boolean
  onCardClick?: (user: User) => void
}

export function UserCardGrid({
  data,
  pageIndex,
  pageSize,
  pageCount,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
  onCardClick,
}: UserCardGridProps) {
  const safePageCount = Math.max(0, pageCount)
  const canPrevious = pageIndex > 0
  const canNext = pageIndex < safePageCount - 1

  return (
    <div className="flex w-full flex-col gap-4 px-4 lg:px-6">
      <div className="relative">
        {isLoading ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-background/50 backdrop-blur-[1px]">
            <div className="text-muted-foreground text-xs">
              Loading users...
            </div>
          </div>
        ) : null}

        {data.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] lg:gap-4">
            {data.map((user) => (
              <UserCard
                key={user._id}
                user={user}
                onClick={() => onCardClick?.(user)}
              />
            ))}
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center rounded-xl border">
            <span className="text-muted-foreground text-sm">No users found.</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-1" />
        <div className="flex w-full items-center gap-6 lg:w-fit">
          <div className="hidden items-center gap-2 lg:flex">
            <Label htmlFor="cards-per-page" className="text-sm font-medium">
              Cards per page
            </Label>
            <select
              id="cards-per-page"
              className="border-input bg-background text-foreground focus-visible:ring-ring inline-flex h-8 w-20 items-center justify-between rounded-md border px-2 text-sm shadow-sm focus-visible:ring-1 focus-visible:outline-none"
              value={pageSize}
              onChange={(event) =>
                onPageSizeChange(Number(event.target.value))
              }
            >
              {[12, 24, 30, 48, 60].map((size) => (
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
              onClick={() => onPageChange(0)}
              disabled={!canPrevious}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeftIcon className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => onPageChange(pageIndex - 1)}
              disabled={!canPrevious}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeftIcon className="size-4" />
            </Button>

            <div className="flex w-fit items-center justify-center text-sm font-medium">
              {Math.min(pageIndex + 1, Math.max(safePageCount, 1))} of{' '}
              {safePageCount || 1}
            </div>

            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => onPageChange(pageIndex + 1)}
              disabled={!canNext}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRightIcon className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              onClick={() => onPageChange(Math.max(safePageCount, 1) - 1)}
              disabled={!canNext}
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
