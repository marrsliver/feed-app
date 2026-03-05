'use client'

import { useState, useEffect, useCallback } from 'react'
import type { UserSource } from '@/lib/types'

const COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16',
]

export function useUserSources() {
  const [sources, setSources] = useState<UserSource[]>([])

  useEffect(() => {
    fetch('/api/db/user-sources')
      .then((r) => r.json())
      .then((data: UserSource[]) => setSources(data))
      .catch(() => {})
  }, [])

  const addSource = useCallback((source: Omit<UserSource, 'color' | 'addedAt'>) => {
    setSources((prev) => {
      if (prev.some((s) => s.feedUrl === source.feedUrl)) return prev
      const color = COLORS[prev.length % COLORS.length]
      const addedAt = Date.now()
      const next = [...prev, { ...source, color, addedAt }]
      fetch('/api/db/user-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...source, color, addedAt }),
      }).catch(() => {})
      return next
    })
  }, [])

  const removeSource = useCallback((id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id))
    fetch(`/api/db/user-sources/${id}`, { method: 'DELETE' }).catch(() => {})
  }, [])

  const toggleFeed = useCallback((id: string) => {
    setSources((prev) => {
      const next = prev.map((s) => s.id === id ? { ...s, inFeed: !s.inFeed } : s)
      const updated = next.find((s) => s.id === id)
      if (updated) {
        fetch(`/api/db/user-sources/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inFeed: updated.inFeed }),
        }).catch(() => {})
      }
      return next
    })
  }, [])

  return { userSources: sources, addSource, removeSource, toggleFeed }
}
