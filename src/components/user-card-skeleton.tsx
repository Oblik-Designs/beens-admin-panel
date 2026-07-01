import { Skeleton } from '@/components/ui/skeleton'

export function UserCardSkeleton() {
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border bg-muted">
      <Skeleton className="absolute inset-0 rounded-none" />
      <div className="absolute inset-x-0 bottom-0 space-y-2 p-2.5">
        <Skeleton className="h-3.5 w-3/4" />
        <div className="flex gap-1">
          <Skeleton className="h-4 w-12 rounded-full" />
          <Skeleton className="h-4 w-14 rounded-full" />
        </div>
        <Skeleton className="h-2.5 w-full" />
        <Skeleton className="h-2.5 w-2/3" />
      </div>
    </div>
  )
}

export function UserCardSkeletonGrid({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] lg:gap-4">
      {Array.from({ length: count }, (_, index) => (
        <UserCardSkeleton key={index} />
      ))}
    </div>
  )
}
