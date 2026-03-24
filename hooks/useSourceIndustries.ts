'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SourceIndustry } from '@/lib/types'
import { persist } from '@/lib/persist'
import { lsGet, lsSet } from '@/lib/localStorage'

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

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function useSourceIndustries() {
  const [industries, setIndustries] = useState<SourceIndustry[]>(() => lsGet<SourceIndustry[]>(LS_KEY) ?? [])

  useEffect(() => {
    fetch('/api/db/source-industries')
      .then((r) => r.json())
      .then((data: SourceIndustry[]) => {
        if (Array.isArray(data) && data.length > 0) {
          lsSet(LS_KEY, data)
          setIndustries(data)
        } else {
          // DB empty — seed predefined industries
          const cached = lsGet<SourceIndustry[]>(LS_KEY)
          if (cached && cached.length > 0) {
            setIndustries(cached)
          } else {
            // First load: seed defaults into DB and state
            // Use direct fetch (not persist) so we don't queue writes during init
            lsSet(LS_KEY, PREDEFINED_INDUSTRIES)
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
        const cached = lsGet<SourceIndustry[]>(LS_KEY)
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
      lsSet(LS_KEY, next)
      return next
    })
    // persist outside the updater — updaters must be pure (no side effects)
    persist('/api/db/source-industries', 'POST', newInd)
    return id
  }, [])

  const renameIndustry = useCallback((id: string, name: string) => {
    setIndustries((prev) => {
      const next = prev.map((i) => (i.id === id ? { ...i, name: name.trim() } : i))
      lsSet(LS_KEY, next)
      return next
    })
    persist(`/api/db/source-industries/${id}`, 'PATCH', { name: name.trim() })
  }, [])

  const deleteIndustry = useCallback((id: string) => {
    setIndustries((prev) => {
      const next = prev.filter((i) => i.id !== id)
      lsSet(LS_KEY, next)
      return next
    })
    persist(`/api/db/source-industries/${id}`, 'DELETE')
  }, [])

  return { industries, createIndustry, renameIndustry, deleteIndustry }
}
