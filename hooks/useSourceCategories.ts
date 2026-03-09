'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SourceCategory } from '@/lib/types'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function useSourceCategories() {
  const [categories, setCategories] = useState<SourceCategory[]>([])

  useEffect(() => {
    fetch('/api/db/source-categories')
      .then((r) => r.json())
      .then((data: SourceCategory[]) => setCategories(data))
      .catch(() => {})
  }, [])

  const createCategory = useCallback((name: string): string => {
    const id = slugify(name)
    const newCat: SourceCategory = { id, name: name.trim() }
    setCategories((prev) => {
      if (prev.some((c) => c.id === id)) return prev
      fetch('/api/db/source-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCat),
      }).catch(() => {})
      return [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name))
    })
    return id
  }, [])

  const renameCategory = useCallback((id: string, name: string) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name: name.trim() } : c)))
    fetch(`/api/db/source-categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    }).catch(() => {})
  }, [])

  const deleteCategory = useCallback((id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id))
    fetch(`/api/db/source-categories/${id}`, { method: 'DELETE' }).catch(() => {})
  }, [])

  return { categories, createCategory, renameCategory, deleteCategory }
}
