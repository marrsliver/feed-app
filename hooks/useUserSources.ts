'use client'

import { useState, useEffect, useCallback } from 'react'
import type { UserSource } from '@/lib/types'

const STORAGE_KEY = 'feed-user-sources'

const COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16',
]

function load(): UserSource[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (s) return JSON.parse(s)
  } catch { /* ignore */ }
  return []
}

function save(sources: UserSource[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sources)) } catch { /* ignore */ }
}

export function useUserSources() {
  const [sources, setSources] = useState<UserSource[]>([])

  useEffect(() => { setSources(load()) }, [])

  const addSource = useCallback((source: Omit<UserSource, 'color' | 'addedAt'>) => {
    setSources((prev) => {
      const color = COLORS[prev.length % COLORS.length]
      const next = [...prev, { ...source, color, addedAt: Date.now() }]
      save(next)
      return next
    })
  }, [])

  const removeSource = useCallback((id: string) => {
    setSources((prev) => {
      const next = prev.filter((s) => s.id !== id)
      save(next)
      return next
    })
  }, [])

  const toggleFeed = useCallback((id: string) => {
    setSources((prev) => {
      const next = prev.map((s) => s.id === id ? { ...s, inFeed: !s.inFeed } : s)
      save(next)
      return next
    })
  }, [])

  return { userSources: sources, addSource, removeSource, toggleFeed }
}
