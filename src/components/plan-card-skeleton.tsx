import { Skeleton } from '@/components/ui/skeleton'

export function PlanCardSkeleton() {
  return (
    <div className="flex min-h-[136px] w-full overflow-hidden rounded-xl border bg-card">
      <Skeleton className="w-[34%] max-w-[176px] shrink-0 self-stretch rounded-none sm:max-w-[200px]" />
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 p-3">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-5 w-14 shrink-0 rounded-full" />
          </div>
          <div className="flex gap-1">
            <Skeleton className="h-4 w-16 rounded-full" />
            <Skeleton className="h-4 w-20 rounded-full" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  )
}

export function PlanCardSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 xl:gap-4">
      {Array.from({ length: count }, (_, index) => (
        <PlanCardSkeleton key={index} />
      ))}
    </div>
  )
}
