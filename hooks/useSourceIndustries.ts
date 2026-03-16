'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SourceIndustry } from '@/lib/types'
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

const LS_KEY = 'source_industries_cache_v1'

const PREDEFINED_INDUSTRIES: SourceIndustry[] = [
  { id: 'music', name: 'Music' },
  { id: 'film', name: 'Film' },
  { id: 'art', name: 'Art' },
  { id: 'news', name: 'News' },
  { id: 'movement', name: 'Movement' },
  { id: 'writing', name: 'Writing' },
  { id: 'startup', name: 'Startup' },
  { id: 'development', name: 'Development' },
  { id: 'event-calendar', name: 'Event Calendar' },
  { id: 'substack', name: 'Substack' },
]

function readCache(): SourceIndustry[] | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SourceIndustry[]
  } catch { return null }
}

function writeCache(industries: SourceIndustry[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(industries)) } catch { /* ignore */ }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function useSourceIndustries() {
  const [industries, setIndustries] = useState<SourceIndustry[]>(() => readCache() ?? [])

  useEffect(() => {
    fetch('/api/db/source-industries')
      .then((r) => r.json())
      .then((data: SourceIndustry[]) => {
        if (Array.isArray(data) && data.length > 0) {
          writeCache(data)
          setIndustries(data)
        } else {
          // DB empty — seed predefined industries
          const cached = readCache()
          if (cached && cached.length > 0) {
            setIndustries(cached)
          } else {
            // First load: seed defaults into DB and state
            // Use direct fetch (not persist) so we don't queue writes during init
            writeCache(PREDEFINED_INDUSTRIES)
            setIndustries(PREDEFINED_INDUSTRIES)
            PREDEFINED_INDUSTRIES.forEach((ind) => {
              fetch('/api/db/source-industries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ind),
              }).catch(() => {})
            })
          }
        }
      })
      .catch(() => {
        const cached = readCache()
        if (cached && cached.length > 0) setIndustries(cached)
        else setIndustries(PREDEFINED_INDUSTRIES)
      })
  }, [])

  const createIndustry = useCallback((name: string): string => {
    const id = slugify(name)
    const newInd: SourceIndustry = { id, name: name.trim() }
    setIndustries((prev) => {
      if (prev.some((i) => i.id === id)) return prev
      const next = [...prev, newInd].sort((a, b) => a.name.localeCompare(b.name))
      writeCache(next)
      return next
    })
    // persist outside the updater — updaters must be pure (no side effects)
    persist('/api/db/source-industries', 'POST', newInd)
    return id
  }, [])

  const renameIndustry = useCallback((id: string, name: string) => {
    setIndustries((prev) => {
      const next = prev.map((i) => (i.id === id ? { ...i, name: name.trim() } : i))
      writeCache(next)
      return next
    })
    persist(`/api/db/source-industries/${id}`, 'PATCH', { name: name.trim() })
  }, [])

  const deleteIndustry = useCallback((id: string) => {
    setIndustries((prev) => {
      const next = prev.filter((i) => i.id !== id)
      writeCache(next)
      return next
    })
    persist(`/api/db/source-industries/${id}`, 'DELETE')
  }, [])

  return { industries, createIndustry, renameIndustry, deleteIndustry }
}
