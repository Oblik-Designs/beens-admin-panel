'use client'

import * as React from 'react'

import type { Plan } from '@/server/api/plans'
import { CardImagePinLayer } from '@/components/card-image-pin-layer'
import { PlanCard } from '@/components/plan-card'
import {
  PlanCardSkeleton,
  PlanCardSkeletonGrid,
} from '@/components/plan-card-skeleton'
import { Button } from '@/components/ui/button'
import { useInfiniteScrollSentinel } from '@/lib/use-infinite-scroll-sentinel'
import { planCardImageUrls } from '@/lib/plan-format'

const noopPlanClick = (_plan: Plan) => undefined

type PlanCardGridProps = {
  plans: Array<Plan>
  total?: number
  isInitialLoading?: boolean
  isFetchingMore?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  onCardClick?: (plan: Plan) => void
  onClearFilters?: () => void
}

export function PlanCardGrid({
  plans,
  total,
  isInitialLoading = false,
  isFetchingMore = false,
  hasMore = false,
  onLoadMore,
  onCardClick,
  onClearFilters,
}: PlanCardGridProps) {
  const handleLoadMore = React.useCallback(() => {
    if (!hasMore || isFetchingMore) return
    onLoadMore?.()
  }, [hasMore, isFetchingMore, onLoadMore])

  const sentinelRef = useInfiniteScrollSentinel({
    onLoadMore: handleLoadMore,
    enabled: hasMore && !isInitialLoading,
    resetKey: plans.length,
    isLoadingMore: isFetchingMore,
  })

  if (isInitialLoading) {
    return (
      <div className="px-4 lg:px-6">
        <PlanCardSkeletonGrid count={8} />
      </div>
    )
  }

  if (plans.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center rounded-xl border px-4 lg:mx-6">
        <span className="text-muted-foreground text-sm">
          No plans match these filters.
        </span>
        {onClearFilters ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={onClearFilters}
          >
            Clear all filters
          </Button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-4 px-4 lg:px-6">
      <CardImagePinLayer urls={plans.flatMap(planCardImageUrls)} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 xl:gap-4">
        {plans.map((plan) => (
          <PlanCard
            key={plan._id}
            plan={plan}
            onClick={onCardClick ?? noopPlanClick}
          />
        ))}
        {isFetchingMore
          ? Array.from({ length: 4 }, (_, index) => (
              <PlanCardSkeleton key={`more-${index}`} />
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
            ? 'Loading more plans...'
            : 'Scroll for more'
          : total != null && plans.length < total
            ? `Showing ${plans.length.toLocaleString()} of ${total.toLocaleString()} plans`
            : `Showing ${plans.length.toLocaleString()} plan${plans.length === 1 ? '' : 's'}`}
      </div>
    </div>
  )
}
