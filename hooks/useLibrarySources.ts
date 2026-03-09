'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { LibrarySource } from '@/lib/types'

const COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16',
]

export function useLibrarySources() {
  const [sources, setSources] = useState<LibrarySource[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/db/user-sources')
      .then((r) => r.json())
      .then((data: LibrarySource[]) => {
        setSources(data)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  const staticSources = useMemo(() => sources.filter((s) => s.isStatic), [sources])
  const userSources = useMemo(() => sources.filter((s) => !s.isStatic), [sources])
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    sources.forEach((s) => s.tags.forEach((t) => tagSet.add(t)))
    return Array.from(tagSet).sort()
  }, [sources])

  const addSource = useCallback((source: Omit<LibrarySource, 'color' | 'addedAt' | 'isStatic' | 'tags'>) => {
    setSources((prev) => {
      if (prev.some((s) => s.feedUrl && s.feedUrl === source.feedUrl)) return prev
      const userCount = prev.filter((s) => !s.isStatic).length
      const color = COLORS[userCount % COLORS.length]
      const addedAt = Date.now()
      const next: LibrarySource = { ...source, color, addedAt, isStatic: false, tags: [] }
      fetch('/api/db/user-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      }).catch(() => {})
      return [...prev, next]
    })
  }, [])

  const removeSource = useCallback((id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id))
    fetch(`/api/db/user-sources/${id}`, { method: 'DELETE' }).catch(() => {})
  }, [])

  const toggleFeed = useCallback((id: string) => {
    setSources((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, inFeed: !s.inFeed } : s))
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

  const setCategory = useCallback((id: string, categoryId: string | null) => {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, categoryId: categoryId ?? undefined } : s)))
    fetch(`/api/db/user-sources/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId }),
    }).catch(() => {})
  }, [])

  const addTag = useCallback((id: string, tag: string) => {
    setSources((prev) => {
      const next = prev.map((s) => {
        if (s.id !== id || s.tags.includes(tag)) return s
        const tags = [...s.tags, tag]
        fetch(`/api/db/user-sources/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags }),
        }).catch(() => {})
        return { ...s, tags }
      })
      return next
    })
  }, [])

  const removeTag = useCallback((id: string, tag: string) => {
    setSources((prev) => {
      const next = prev.map((s) => {
        if (s.id !== id) return s
        const tags = s.tags.filter((t) => t !== tag)
        fetch(`/api/db/user-sources/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags }),
        }).catch(() => {})
        return { ...s, tags }
      })
      return next
    })
  }, [])

  return {
    sources,
    staticSources,
    userSources,
    allTags,
    loaded,
    addSource,
    removeSource,
    toggleFeed,
    setCategory,
    addTag,
    removeTag,
  }
}
