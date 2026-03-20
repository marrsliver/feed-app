'use client'

import { useState, useCallback } from 'react'
import type { SpaceItem } from '@/lib/types'

const LS_KEY = 'source_space_items_v1'

function readCache(): Record<string, SpaceItem[]> {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, SpaceItem[]>
  } catch { return {} }
}

function writeCache(data: Record<string, SpaceItem[]>) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)) } catch { /* ignore */ }
}

export function useSourceItems() {
  const [allItems, setAllItems] = useState<Record<string, SpaceItem[]>>(() => readCache())

  const update = useCallback((updater: (prev: Record<string, SpaceItem[]>) => Record<string, SpaceItem[]>) => {
    setAllItems((prev) => {
      const next = updater(prev)
      writeCache(next)
      return next
    })
  }, [])

  const getItems = useCallback((sourceId: string): SpaceItem[] => {
    return allItems[sourceId] ?? []
  }, [allItems])

  const appendItem = useCallback((sourceId: string, item: SpaceItem) => {
    update((prev) => ({
      ...prev,
      [sourceId]: [...(prev[sourceId] ?? []), item],
    }))
  }, [update])

  const removeItem = useCallback((sourceId: string, itemId: string) => {
    update((prev) => ({
      ...prev,
      [sourceId]: (prev[sourceId] ?? []).filter((i) => i.id !== itemId),
    }))
  }, [update])

  const updateItem = useCallback((sourceId: string, itemId: string, updates: Partial<SpaceItem>) => {
    update((prev) => ({
      ...prev,
      [sourceId]: (prev[sourceId] ?? []).map((i) => i.id === itemId ? { ...i, ...updates } : i),
    }))
  }, [update])

  const reorderItems = useCallback((sourceId: string, items: SpaceItem[]) => {
    update((prev) => ({ ...prev, [sourceId]: items }))
  }, [update])

  const setAllItemsForSource = useCallback((sourceId: string, items: SpaceItem[]) => {
    update((prev) => ({ ...prev, [sourceId]: items }))
  }, [update])

  return {
    getItems,
    appendItem,
    removeItem,
    updateItem,
    reorderItems,
    setAllItems: setAllItemsForSource,
  }
}
