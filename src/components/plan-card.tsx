'use client'

import * as React from 'react'
import {
  AlertTriangleIcon,
  CalendarIcon,
  EyeIcon,
  ImageIcon,
  MapPinIcon,
  UsersIcon,
} from 'lucide-react'

import type { Plan } from '@/server/api/plans'
import { isEliteUser } from '@/constants/userDataColumns'
import { ImagePreviewDialog } from '@/components/admin/image-preview-dialog'
import { CachedCardImage } from '@/components/cached-card-image'
import { CachedAvatarImage } from '@/components/cached-avatar-image'
import { cn } from '@/lib/utils'
import {
  combinePlanDateAndTime,
  formatPlanBudget,
  formatPlanDateTime,
  planCreatorName,
  planCardImageUrl,
  planParticipantCount,
} from '@/lib/plan-format'

type PlanCardProps = {
  plan: Plan
  onClick: (plan: Plan) => void
}

function PlanStatusBadge({ status }: { status: string }) {
  const tone =
    status === 'Active'
      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
      : status === 'In Progress'
        ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
        : status === 'Suspended'
          ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
          : status === 'Cancelled'
            ? 'bg-red-500/10 text-red-700 dark:text-red-300'
            : status === 'Completed'
              ? 'bg-muted text-muted-foreground'
              : 'bg-muted text-muted-foreground'

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        tone,
      )}
    >
      {status}
    </span>
  )
}

function PlanKindBadge({ plan }: { plan: Plan }) {
  if (plan.isRecurring) {
    return (
      <span className="inline-flex items-center rounded-full bg-violet-500/12 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300">
        Recurring
        {typeof plan.instancesCount === 'number' && plan.instancesCount > 0
          ? ` · ${plan.instancesCount} slot${plan.instancesCount === 1 ? '' : 's'}`
          : ''}
      </span>
    )
  }

  if (plan.parentPlanId) {
    return (
      <span className="inline-flex items-center rounded-full bg-sky-500/12 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-300">
        Slot instance
      </span>
    )
  }

  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      One-off
    </span>
  )
}

function planImage(plan: Plan) {
  return planCardImageUrl(plan)
}

export const PlanCard = React.memo(function PlanCard({ plan, onClick }: PlanCardProps) {
  const onClickRef = React.useRef(onClick)
  onClickRef.current = onClick

  const [previewOpen, setPreviewOpen] = React.useState(false)
  const image = planImage(plan)
  const creator = plan.creator
  const hostName = planCreatorName(creator)
  const hostInitials = hostName
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const location = [plan.location?.city, plan.location?.state]
    .filter(Boolean)
    .join(', ')
  const startLabel = formatPlanDateTime(
    combinePlanDateAndTime(plan.startDate, plan.startTime),
  )
  const budgetLabel = formatPlanBudget(plan.budget?.amount, plan.budget?.currency)
  const participantsLabel = planParticipantCount(plan)
  const reportCount = plan.reportCount ?? 0
  const creatorIsElite = creator
    ? isEliteUser({
        permanentElite: (creator as { permanentElite?: boolean }).permanentElite,
        subscriptionEnd: (creator as { subscriptionEnd?: string }).subscriptionEnd,
      })
    : false

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClickRef.current(plan)
    }
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onClickRef.current(plan)}
        onKeyDown={handleKeyDown}
        className={cn(
          'plan-card group flex w-full min-h-[136px] overflow-hidden rounded-xl border bg-card text-left shadow-sm',
          'will-change-transform isolate [contain:paint]',
          'cursor-pointer transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md',
          'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
          creatorIsElite && 'plan-card-elite',
        )}
        aria-label={`Open ${plan.title}`}
      >
        <div className="plan-card__media relative w-[34%] max-w-[176px] shrink-0 self-stretch sm:max-w-[200px]">
          {image ? (
            <CachedCardImage
              src={image}
              alt=""
              className="absolute inset-0 size-full"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-muted to-primary/10">
              <ImageIcon className="size-8 text-muted-foreground/70" />
            </div>
          )}

          {image ? (
            <button
              type="button"
              className="absolute inset-0 z-10 cursor-zoom-in bg-transparent"
              onClick={(event) => {
                event.stopPropagation()
                setPreviewOpen(true)
              }}
              aria-label={`View ${plan.title} photo`}
            />
          ) : null}

          {reportCount > 0 ? (
            <span className="pointer-events-none absolute top-2 left-2 z-1 inline-flex items-center rounded-full bg-destructive px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
              {reportCount} report{reportCount === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 p-3">
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="line-clamp-2 text-sm leading-snug font-semibold">
                {plan.title}
              </h3>
              <PlanStatusBadge status={plan.status} />
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <PlanKindBadge plan={plan} />
              {plan.type ? (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {plan.type}
                </span>
              ) : null}
              {plan.category?.name ? (
                <span className="inline-flex max-w-[140px] items-center truncate rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {plan.category.name}
                </span>
              ) : null}
            </div>

            {plan.parentPlanId && plan.parentPlan?.title ? (
              <p className="truncate text-[10px] text-muted-foreground">
                ↳ {plan.parentPlan.title}
              </p>
            ) : null}

            {plan.timezoneMismatch ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-300">
                <AlertTriangleIcon className="size-3" />
                TZ shift?
              </span>
            ) : null}
          </div>

          <div className="grid gap-1 text-[11px] text-muted-foreground">
            {location ? (
              <div className="flex min-w-0 items-center gap-1.5">
                <MapPinIcon className="size-3 shrink-0" />
                <span className="truncate">{location}</span>
              </div>
            ) : null}

            {startLabel ? (
              <div className="flex min-w-0 items-center gap-1.5">
                <CalendarIcon className="size-3 shrink-0" />
                <span className="truncate">{startLabel}</span>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1">
                <UsersIcon className="size-3 shrink-0" />
                {participantsLabel}
                {plan.isRecurring &&
                typeof plan.instanceParticipantsTotal === 'number'
                  ? ' across slots'
                  : ''}
              </span>
              {budgetLabel ? <span>{budgetLabel}</span> : null}
              <span className="inline-flex items-center gap-1">
                <EyeIcon className="size-3 shrink-0" />
                {(plan.views ?? 0).toLocaleString()}
              </span>
            </div>

            <div className="flex min-w-0 items-center gap-1.5 pt-0.5">
              <CachedAvatarImage
                src={creator?.profileImage}
                alt={hostName}
                className="size-4 shrink-0"
                fallback={
                  <span className="text-[8px]">{hostInitials}</span>
                }
              />
              <span className="truncate font-medium text-foreground/80">
                {hostName}
              </span>
            </div>
          </div>
        </div>
      </div>

      {image ? (
        <ImagePreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          src={image}
          alt={plan.title}
          label="plan photo"
        />
      ) : null}
    </>
  )
}, (prev, next) => prev.plan._id === next.plan._id)
