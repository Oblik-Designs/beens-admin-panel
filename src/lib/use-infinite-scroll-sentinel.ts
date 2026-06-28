'use client'

import * as React from 'react'

function getScrollParent(node: HTMLElement): Element | null {
  let parent = node.parentElement
  while (parent) {
    const { overflowY } = window.getComputedStyle(parent)
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
      return parent
    }
    parent = parent.parentElement
  }
  return null
}

function isNodeInScrollView(node: HTMLElement, root: Element | null) {
  const nodeRect = node.getBoundingClientRect()
  if (!root) {
    return nodeRect.top <= window.innerHeight + 400
  }
  const rootRect = root.getBoundingClientRect()
  return nodeRect.top <= rootRect.bottom + 400
}

type UseInfiniteScrollSentinelOptions = {
  onLoadMore: () => void
  enabled: boolean
  /** Bust cache when the list length changes so we re-check visibility. */
  resetKey?: number
  isLoadingMore?: boolean
}

export function useInfiniteScrollSentinel({
  onLoadMore,
  enabled,
  resetKey = 0,
  isLoadingMore = false,
}: UseInfiniteScrollSentinelOptions) {
  const sentinelRef = React.useRef<HTMLDivElement | null>(null)
  const onLoadMoreRef = React.useRef(onLoadMore)
  const rootRef = React.useRef<Element | null>(null)

  React.useEffect(() => {
    onLoadMoreRef.current = onLoadMore
  }, [onLoadMore])

  React.useLayoutEffect(() => {
    if (!enabled) return

    const node = sentinelRef.current
    if (!node) return

    const root = getScrollParent(node)
    rootRef.current = root

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMoreRef.current()
        }
      },
      {
        root,
        rootMargin: '0px 0px 400px 0px',
        threshold: 0,
      },
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [enabled, resetKey])

  React.useLayoutEffect(() => {
    if (!enabled || isLoadingMore) return

    const node = sentinelRef.current
    if (!node) return

    const id = window.requestAnimationFrame(() => {
      if (isNodeInScrollView(node, rootRef.current)) {
        onLoadMoreRef.current()
      }
    })

    return () => window.cancelAnimationFrame(id)
  }, [enabled, isLoadingMore, resetKey])

  return sentinelRef
}
