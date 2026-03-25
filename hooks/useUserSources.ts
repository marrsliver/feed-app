'use client'

import { useState, useEffect, useCallback } from 'react'
import type { LibrarySource } from '@/lib/types'
import { lsGet, lsSet } from '@/lib/localStorage'
import { LS_KEYS } from '@/lib/storageKeys'

const LS_KEY = LS_KEYS.USER_SOURCES

const COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16',
]

export function useLibrarySources() {
  // Seed immediately from cache so sources survive DB outages
  const [sources, setSources] = useState<LibrarySource[]>(() => lsGet<LibrarySource[]>(LS_KEY) ?? [])

  useEffect(() => {
    fetch('/api/db/user-sources')
      .then((r) => r.json())
      .then((data: unknown) => {
        if (!Array.isArray(data)) return
        setSources(data as LibrarySource[])
        lsSet(LS_KEY, data)
      })
      .catch(() => { /* already seeded from cache above */ })
  }, [])

  const addSource = useCallback((source: Omit<LibrarySource, 'color' | 'addedAt'>) => {
    setSources((prev) => {
      if (prev.some((s) => s.feedUrl === source.feedUrl)) return prev
      const color = COLORS[prev.length % COLORS.length]
      const addedAt = Date.now()
      const next = [...prev, { ...source, color, addedAt }]
      lsSet(LS_KEY, next)
      fetch('/api/db/user-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...source, color, addedAt }),
      }).catch(() => {})
      return next
    })
  }, [])

  const removeSource = useCallback((id: string) => {
    setSources((prev) => {
      const next = prev.filter((s) => s.id !== id)
      lsSet(LS_KEY, next)
      return next
    })
    fetch(`/api/db/user-sources/${id}`, { method: 'DELETE' }).catch(() => {})
  }, [])

  const toggleFeed = useCallback((id: string) => {
    setSources((prev) => {
      const next = prev.map((s) => s.id === id ? { ...s, inFeed: !s.inFeed } : s)
      lsSet(LS_KEY, next)
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
