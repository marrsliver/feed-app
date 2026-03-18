'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { LibrarySource, SourceCard } from '@/lib/types'
import { researchSources, musicSources } from '@/lib/sources.config'
import { queueWrite, clearWrite } from '@/lib/pendingWrites'
import { notifyPendingWritesChanged } from './usePendingWrites'

function persist(url: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown) {
  const writeId = queueWrite(url, method, body)
  notifyPendingWritesChanged()
  fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
    .then((r) => { if (r.ok) { clearWrite(writeId); notifyPendingWritesChanged() } })
    .catch(() => { /* stays in queue until replayed */ })
}

const COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16',
]

// Hardcoded baseline static sources — always available, no DB required
const STATIC_LIBRARY_SOURCES: LibrarySource[] = [
  ...researchSources.map(s => ({
    id: s.id, name: s.name, url: s.url, feedUrl: s.feedUrl ?? '',
    color: s.color, type: s.type, apiPath: s.apiPath,
    inFeed: true, addedAt: 0, isStatic: true, feedGroup: 'research', tags: [],
  })),
  ...musicSources.map(s => ({
    id: s.id, name: s.name, url: s.url, feedUrl: s.feedUrl ?? '',
    color: s.color, type: s.type, apiPath: s.apiPath,
    inFeed: true, addedAt: 0, isStatic: true, feedGroup: 'music', tags: [],
  })),
]

const LS_CACHE_KEY = 'library_sources_cache_v1'

function readCache(): LibrarySource[] | null {
  try {
    const raw = localStorage.getItem(LS_CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as LibrarySource[]
  } catch {
    return null
  }
}

function writeCache(sources: LibrarySource[]) {
  try {
    localStorage.setItem(LS_CACHE_KEY, JSON.stringify(sources))
  } catch {
    // localStorage full or unavailable — not fatal
  }
}

// Merge DB data with hardcoded statics:
// - Static sources always come from config (guaranteed present)
// - DB version overlays metadata (tags, categories, etc.) when available
// - User-added sources (isStatic=false) come from DB only
function mergeSources(dbData: LibrarySource[]): LibrarySource[] {
  const dbById = new Map(dbData.map(s => [s.id, s]))
  const staticIds = new Set(STATIC_LIBRARY_SOURCES.map(s => s.id))
  const statics = STATIC_LIBRARY_SOURCES.map(s => dbById.get(s.id) ?? s)
  const userAdded = dbData.filter(s => !staticIds.has(s.id))
  return [...statics, ...userAdded]
}

export function useLibrarySources() {
  const [sources, setSources] = useState<LibrarySource[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/db/user-sources')
      .then((r) => r.json())
      .then((data: LibrarySource[]) => {
        if (data.length > 0) {
          // DB returned real data — merge, cache, and use it
          const merged = mergeSources(data)
          writeCache(merged)
          setSources(merged)
        } else {
          // DB returned empty — could be a Supabase pause or blip
          // Fall back to localStorage cache to preserve user's work
          const cached = readCache()
          if (cached && cached.length > 0) {
            setSources(cached)
          } else {
            // No cache either — use hardcoded statics so the feed still works
            setSources(STATIC_LIBRARY_SOURCES)
          }
        }
        setLoaded(true)
      })
      .catch(() => {
        // Network or DB error — same fallback chain
        const cached = readCache()
        if (cached && cached.length > 0) {
          setSources(cached)
        } else {
          setSources(STATIC_LIBRARY_SOURCES)
        }
        setLoaded(true)
      })
  }, [])

  const staticSources = useMemo(() => sources.filter((s) => s.isStatic), [sources])
  const userSources = useMemo(() => sources.filter((s) => !s.isStatic), [sources])
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    sources.forEach((s) => s.tags.forEach((t) => tagSet.add(t)))
    return Array.from(tagSet).sort()
  }, [sources])

  // After any mutation, update the cache so it stays fresh
  const updateSources = useCallback((updater: (prev: LibrarySource[]) => LibrarySource[]) => {
    setSources((prev) => {
      const next = updater(prev)
      writeCache(next)
      return next
    })
  }, [])

  const addSource = useCallback((source: Omit<LibrarySource, 'color' | 'addedAt' | 'isStatic' | 'tags'>) => {
    updateSources((prev) => {
      if (prev.some((s) => s.feedUrl && s.feedUrl === source.feedUrl)) return prev
      const userCount = prev.filter((s) => !s.isStatic).length
      const color = COLORS[userCount % COLORS.length]
      const addedAt = Date.now()
      const next: LibrarySource = { ...source, color, addedAt, isStatic: false, tags: [] }
      persist('/api/db/user-sources', 'POST', next)
      return [...prev, next]
    })
  }, [updateSources])

  const removeSource = useCallback((id: string) => {
    updateSources((prev) => prev.filter((s) => s.id !== id))
    persist(`/api/db/user-sources/${id}`, 'DELETE')
  }, [updateSources])

  const renameSource = useCallback((id: string, name: string) => {
    updateSources((prev) => prev.map((s) => s.id === id ? { ...s, name } : s))
    persist(`/api/db/user-sources/${id}`, 'PATCH', { name })
  }, [updateSources])

  const toggleFeed = useCallback((id: string) => {
    updateSources((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, inFeed: !s.inFeed } : s))
      const updated = next.find((s) => s.id === id)
      if (updated) {
        persist(`/api/db/user-sources/${id}`, 'PATCH', { inFeed: updated.inFeed })
      }
      return next
    })
  }, [updateSources])

  const setCategory = useCallback((id: string, categoryId: string | null) => {
    updateSources((prev) => prev.map((s) => (s.id === id ? { ...s, categoryId: categoryId ?? undefined } : s)))
    persist(`/api/db/user-sources/${id}`, 'PATCH', { categoryId })
  }, [updateSources])

  const setIndustry = useCallback((id: string, industryId: string | null) => {
    updateSources((prev) => prev.map((s) => (s.id === id ? { ...s, industryId: industryId ?? undefined } : s)))
    persist(`/api/db/user-sources/${id}`, 'PATCH', { industryId })
  }, [updateSources])

  const addTag = useCallback((id: string, tag: string) => {
    updateSources((prev) => {
      return prev.map((s) => {
        if (s.id !== id || s.tags.includes(tag)) return s
        const tags = [...s.tags, tag]
        persist(`/api/db/user-sources/${id}`, 'PATCH', { tags })
        return { ...s, tags }
      })
    })
  }, [updateSources])

  const removeTag = useCallback((id: string, tag: string) => {
    updateSources((prev) => {
      return prev.map((s) => {
        if (s.id !== id) return s
        const tags = s.tags.filter((t) => t !== tag)
        persist(`/api/db/user-sources/${id}`, 'PATCH', { tags })
        return { ...s, tags }
      })
    })
  }, [updateSources])

  const addSourceCard = useCallback((sourceId: string, card: SourceCard) => {
    updateSources((prev) => prev.map((s) => {
      if (s.id !== sourceId) return s
      if ((s.cards ?? []).some(c => c.id === card.id)) return s // already exists
      const cards = [...(s.cards ?? []), card]
      persist(`/api/db/user-sources/${sourceId}`, 'PATCH', { cards })
      return { ...s, cards }
    }))
  }, [updateSources])

  const removeSourceCard = useCallback((sourceId: string, cardId: string) => {
    updateSources((prev) => prev.map((s) => {
      if (s.id !== sourceId) return s
      const cards = (s.cards ?? []).filter((c) => c.id !== cardId)
      persist(`/api/db/user-sources/${sourceId}`, 'PATCH', { cards })
      return { ...s, cards }
    }))
  }, [updateSources])

  return {
    sources,
    staticSources,
    userSources,
    allTags,
    loaded,
    addSource,
    removeSource,
    renameSource,
    toggleFeed,
    setCategory,
    setIndustry,
    addTag,
    removeTag,
    addSourceCard,
    removeSourceCard,
  }
}
