'use client'

import * as React from 'react'

import { CachedCardImage } from '@/components/cached-card-image'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

type CachedAvatarImageProps = {
  src?: string | null
  alt: string
  fallback: React.ReactNode
  className?: string
  imageClassName?: string
}

/** Circular avatar backed by the same ImageBitmap cache as list cards. */
export function CachedAvatarImage({
  src,
  alt,
  fallback,
  className,
  imageClassName,
}: CachedAvatarImageProps) {
  const imageSrc = src?.trim()

  if (!imageSrc) {
    return (
      <Avatar className={cn('relative overflow-hidden', className)}>
        <AvatarFallback>{fallback}</AvatarFallback>
      </Avatar>
    )
  }

  return (
    <Avatar className={cn('relative overflow-hidden', className)}>
      <CachedCardImage
        src={imageSrc}
        alt={alt}
        className={cn('absolute inset-0 rounded-[inherit]', imageClassName)}
      />
    </Avatar>
  )
}
