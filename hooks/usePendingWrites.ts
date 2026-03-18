'use client'

import { useState, useEffect, useCallback } from 'react'
import { getPendingCount, replayPendingWrites, clearAllWrites } from '@/lib/pendingWrites'

// Broadcast to all hook instances in the same tab when the queue changes
const CHANNEL = 'pending-writes-updated'

export function notifyPendingWritesChanged() {
  // Defer the event so it never fires during a React render/commit cycle
  if (typeof window !== 'undefined') {
    queueMicrotask(() => window.dispatchEvent(new CustomEvent(CHANNEL)))
  }
}

export function usePendingWrites() {
  const [pendingCount, setPendingCount] = useState(0)
  const [retrying, setRetrying] = useState(false)

  const refresh = useCallback(() => {
    setPendingCount(getPendingCount())
  }, [])

  // Read initial count and replay on mount
  useEffect(() => {
    refresh()
    // Attempt to flush any queued writes from a previous session
    replayPendingWrites().then(({ succeeded }) => {
      if (succeeded > 0) refresh()
    })
  }, [refresh])

  // Keep count in sync when other hooks mutate the queue
  useEffect(() => {
    window.addEventListener(CHANNEL, refresh)
    return () => window.removeEventListener(CHANNEL, refresh)
  }, [refresh])

  const retry = useCallback(async () => {
    setRetrying(true)
    const { succeeded } = await replayPendingWrites()
    refresh()
    setRetrying(false)
    return succeeded
  }, [refresh])

  const dismissAll = useCallback(() => {
    clearAllWrites()
    refresh()
    notifyPendingWritesChanged()
  }, [refresh])

  return { pendingCount, retrying, retry, dismissAll }
}
