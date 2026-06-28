'use client'

import * as React from 'react'
import { MailIcon, MapPinIcon, UserIcon } from 'lucide-react'

import type { User } from '@/constants/userDataColumns'
import { isEliteUser, KYC_LABEL } from '@/constants/userDataColumns'
import { ImagePreviewDialog } from '@/components/admin/image-preview-dialog'
import { CachedCardImage } from '@/components/cached-card-image'
import { EliteBadge } from '@/components/elite-badge'
import { cn } from '@/lib/utils'

type UserCardProps = {
  user: User
  onClick: (user: User) => void
}

function userDisplayName(user: User) {
  return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'User'
}

function userInitials(user: User) {
  const first = user.firstName?.[0] ?? ''
  const last = user.lastName?.[0] ?? ''
  return (first + last).toUpperCase() || '?'
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === 'ACTIVE'
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide',
        isActive
          ? 'bg-emerald-400/25 text-emerald-50'
          : 'bg-white/15 text-white/75',
      )}
    >
      {isActive ? 'Active' : 'Unverified'}
    </span>
  )
}

function KycBadge({ status }: { status: NonNullable<User['kyc']>['status'] }) {
  const label = KYC_LABEL[status]
  const tone =
    status === 'APPROVED'
      ? 'bg-emerald-400/25 text-emerald-50'
      : status === 'PENDING'
        ? 'bg-amber-400/25 text-amber-50'
        : status === 'REJECTED'
          ? 'bg-red-400/25 text-red-50'
          : 'bg-white/15 text-white/70'

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-1.5 py-px text-[9px] font-semibold',
        tone,
      )}
    >
      {status === 'APPROVED' ? 'KYC ✓' : label}
    </span>
  )
}

export const UserCard = React.memo(function UserCard({ user, onClick }: UserCardProps) {
  const onClickRef = React.useRef(onClick)
  onClickRef.current = onClick

  const [previewOpen, setPreviewOpen] = React.useState(false)
  const name = userDisplayName(user)
  const isElite = isEliteUser(user)
  const kycStatus = user.kyc?.status ?? 'NOT_STARTED'
  const plans = user.totalPlans ?? 0
  const plansLabel =
    plans > 0 ? `${plans} plan${plans === 1 ? '' : 's'}` : 'No plans'
  const profileImage = user.profileImage?.trim() || null

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClickRef.current(user)
    }
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onClickRef.current(user)}
        onKeyDown={handleKeyDown}
        className={cn(
          'group relative aspect-[4/5] w-full overflow-hidden rounded-xl border text-left shadow-sm',
          'will-change-transform isolate [contain:paint]',
          'cursor-pointer transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md',
          'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
          profileImage ? 'bg-zinc-900' : 'bg-muted',
          isElite && 'user-card-elite',
        )}
        aria-label={`Open ${name}`}
      >
        {profileImage ? (
          <CachedCardImage
            src={profileImage}
            alt=""
            className="absolute inset-0 size-full"
            objectPosition="center 15%"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-muted to-primary/10">
            {userInitials(user) !== '?' ? (
              <span className="text-3xl font-semibold text-muted-foreground">
                {userInitials(user)}
              </span>
            ) : (
              <UserIcon className="size-10 text-muted-foreground" />
            )}
          </div>
        )}

        {profileImage ? (
          <button
            type="button"
            className="absolute inset-x-0 top-0 bottom-[28%] z-20 cursor-zoom-in bg-transparent"
            onClick={(event) => {
              event.stopPropagation()
              setPreviewOpen(true)
            }}
            aria-label={`View ${name} profile photo`}
          />
        ) : null}

        {isElite ? (
          <div className="pointer-events-none absolute top-2.5 left-2.5 z-3">
            <EliteBadge />
          </div>
        ) : null}

        <div className="user-card-overlay z-2 h-[28%] overflow-hidden">
          <div className="user-card-overlay__content min-w-0 space-y-1">
            <div className="truncate text-[13px] leading-tight font-semibold text-white">
              {name}
            </div>
            <div className="flex flex-wrap gap-1">
              <StatusBadge status={user.status ?? 'UNVERIFIED'} />
              <KycBadge status={kycStatus} />
            </div>
            {user.email ? (
              <div className="flex min-w-0 items-center gap-1 pt-0.5 text-[10px] text-white/90">
                <MailIcon className="size-2.5 shrink-0 opacity-80" />
                <span className="truncate">{user.email}</span>
              </div>
            ) : null}
            <div className="flex min-w-0 items-center gap-1 text-[10px] text-white/65">
              {user.address?.country ? (
                <>
                  <MapPinIcon className="size-2.5 shrink-0 opacity-80" />
                  <span className="truncate">{user.address.country}</span>
                  <span className="text-white/35">·</span>
                </>
              ) : null}
              <span className="shrink-0">{plansLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {profileImage ? (
        <ImagePreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          src={profileImage}
          alt={name}
          label="profile photo"
        />
      ) : null}
    </>
  )
}, (prev, next) => prev.user._id === next.user._id)
