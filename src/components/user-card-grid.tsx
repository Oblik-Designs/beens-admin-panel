'use client'

import * as React from 'react'

import type { User } from '@/constants/userDataColumns'
import { CardImagePinLayer } from '@/components/card-image-pin-layer'
import { UserCard } from '@/components/user-card'
import {
  UserCardSkeleton,
  UserCardSkeletonGrid,
} from '@/components/user-card-skeleton'
import { useInfiniteScrollSentinel } from '@/lib/use-infinite-scroll-sentinel'

const noopUserClick = (_user: User) => undefined

type UserCardGridProps = {
  users: Array<User>
  total?: number
  isInitialLoading?: boolean
  isFetchingMore?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  onCardClick?: (user: User) => void
}

export function UserCardGrid({
  users,
  total,
  isInitialLoading = false,
  isFetchingMore = false,
  hasMore = false,
  onLoadMore,
  onCardClick,
}: UserCardGridProps) {
  const handleLoadMore = React.useCallback(() => {
    if (!hasMore || isFetchingMore) return
    onLoadMore?.()
  }, [hasMore, isFetchingMore, onLoadMore])

  const sentinelRef = useInfiniteScrollSentinel({
    onLoadMore: handleLoadMore,
    enabled: hasMore && !isInitialLoading,
    resetKey: users.length,
    isLoadingMore: isFetchingMore,
  })

  if (isInitialLoading) {
    return (
      <div className="px-4 lg:px-6">
        <UserCardSkeletonGrid count={12} />
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border px-4 lg:mx-6">
        <span className="text-muted-foreground text-sm">No users found.</span>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-4 px-4 lg:px-6">
      <CardImagePinLayer
        urls={users.map((user) => user.profileImage)}
      />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] lg:gap-4">
        {users.map((user) => (
          <UserCard
            key={user._id}
            user={user}
            onClick={onCardClick ?? noopUserClick}
          />
        ))}
        {isFetchingMore
          ? Array.from({ length: 4 }, (_, index) => (
              <UserCardSkeleton key={`more-${index}`} />
            ))
          : null}
      </div>

      <div
        ref={sentinelRef}
        className="h-8 w-full shrink-0"
        aria-hidden="true"
      />

      <div className="pb-4 text-center text-xs text-muted-foreground">
        {hasMore
          ? isFetchingMore
            ? 'Loading more users...'
            : 'Scroll for more'
          : total != null && users.length < total
            ? `Showing ${users.length.toLocaleString()} of ${total.toLocaleString()} users`
            : `Showing ${users.length.toLocaleString()} user${users.length === 1 ? '' : 's'}`}
      </div>
    </div>
  )
}
