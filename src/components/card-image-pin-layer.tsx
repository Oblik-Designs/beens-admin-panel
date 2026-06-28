'use client'

import * as React from 'react'

import {
  collectCardImageUrls,
  ensureImageBitmapCached,
} from '@/lib/card-image-cache'

type CardImagePinLayerProps = {
  urls: Array<string | null | undefined>
}

/** Pre-decode list images into the session ImageBitmap cache. */
export function CardImagePinLayer({ urls }: CardImagePinLayerProps) {
  const pinnedUrls = React.useMemo(() => collectCardImageUrls(urls), [urls])

  React.useLayoutEffect(() => {
    for (const url of pinnedUrls) {
      ensureImageBitmapCached(url)
    }
  }, [pinnedUrls])

  return null
}
