'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SourceCategory } from '@/lib/types'

const LS_KEY = 'source_categories_cache_v1'

function readCache(): SourceCategory[] | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SourceCategory[]
  } catch { return null }
}

function writeCache(cats: SourceCategory[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(cats)) } catch { /* ignore */ }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function useSourceCategories() {
  // Seed from cache immediately so categories are available before the API returns
  const [categories, setCategories] = useState<SourceCategory[]>(() => readCache() ?? [])

  useEffect(() => {
    fetch('/api/db/source-categories')
      .then((r) => r.json())
      .then((data: SourceCategory[]) => {
        if (Array.isArray(data) && data.length > 0) {
          writeCache(data)
          setCategories(data)
        } else {
          // DB empty or error — keep whatever is in cache / state
          const cached = readCache()
          if (cached && cached.length > 0) setCategories(cached)
        }
      })
      .catch(() => {
        const cached = readCache()
        if (cached && cached.length > 0) setCategories(cached)
      })
  }, [])

  const updateCategories = useCallback((next: SourceCategory[]) => {
    writeCache(next)
    setCategories(next)
  }, [])

  const createCategory = useCallback((name: string): string => {
    const id = slugify(name)
    const newCat: SourceCategory = { id, name: name.trim() }
    setCategories((prev) => {
      if (prev.some((c) => c.id === id)) return prev
      const next = [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name))
      writeCache(next)
      fetch('/api/db/source-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCat),
      }).catch(() => {})
      return next
    })
    return id
  }, [])

  const renameCategory = useCallback((id: string, name: string) => {
    setCategories((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, name: name.trim() } : c))
      writeCache(next)
      return next
    })
    fetch(`/api/db/source-categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    }).catch(() => {})
  }, [])

  const deleteCategory = useCallback((id: string) => {
    setCategories((prev) => {
      const next = prev.filter((c) => c.id !== id)
      writeCache(next)
      return next
    })
    fetch(`/api/db/source-categories/${id}`, { method: 'DELETE' }).catch(() => {})
  }, [])

  return { categories, createCategory, renameCategory, deleteCategory }
}
