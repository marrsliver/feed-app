'use client'

import { useCallback } from 'react'
import type { SourceCategory } from '@/lib/types'
import { persist } from '@/lib/persist'
import { lsSet } from '@/lib/localStorage'
import { useCachedAPI } from '@/hooks/useCachedAPI'

const LS_KEY = 'source_categories_cache_v1'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function useSourceCategories() {
  // Seed from cache immediately so categories are available before the API returns
  const [categories, setCategories] = useCachedAPI<SourceCategory[]>(
    '/api/db/source-categories',
    LS_KEY,
    [],
  )

  const updateCategories = useCallback((next: SourceCategory[]) => {
    lsSet(LS_KEY, next)
    setCategories(next)
  }, [])

  const createCategory = useCallback((name: string): string => {
    const id = slugify(name)
    const newCat: SourceCategory = { id, name: name.trim() }
    setCategories((prev) => {
      if (prev.some((c) => c.id === id)) return prev
      const next = [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name))
      lsSet(LS_KEY, next)
      return next
    })
    // persist outside the updater — updaters must be pure (no side effects)
    persist('/api/db/source-categories', 'POST', newCat)
    return id
  }, [])

  const renameCategory = useCallback((id: string, name: string) => {
    setCategories((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, name: name.trim() } : c))
      lsSet(LS_KEY, next)
      return next
    })
    persist(`/api/db/source-categories/${id}`, 'PATCH', { name: name.trim() })
  }, [])

  const deleteCategory = useCallback((id: string) => {
    setCategories((prev) => {
      const next = prev.filter((c) => c.id !== id)
      lsSet(LS_KEY, next)
      return next
    })
    persist(`/api/db/source-categories/${id}`, 'DELETE')
  }, [])

  return { categories, createCategory, renameCategory, deleteCategory }
}
