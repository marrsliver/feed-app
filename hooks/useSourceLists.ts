'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SourceList } from '@/lib/types'

const LS_KEY = 'source_lists_cache_v1'

function readCache(): SourceList[] | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SourceList[]
  } catch { return null }
}

function writeCache(lists: SourceList[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(lists)) } catch { /* ignore */ }
}

export function useSourceLists() {
  const [lists, setLists] = useState<SourceList[]>(() => readCache() ?? [])

  useEffect(() => {
    fetch('/api/db/source-lists')
      .then((r) => r.json())
      .then((data: SourceList[]) => {
        if (Array.isArray(data) && data.length > 0) {
          writeCache(data)
          setLists(data)
        } else {
          const cached = readCache()
          if (cached && cached.length > 0) setLists(cached)
        }
      })
      .catch(() => {
        const cached = readCache()
        if (cached) setLists(cached)
      })
  }, [])

  const updateLists = useCallback((updater: (prev: SourceList[]) => SourceList[]) => {
    setLists((prev) => {
      const next = updater(prev)
      writeCache(next)
      return next
    })
  }, [])

  const createList = useCallback((name: string): string => {
    const id = Date.now().toString()
    const newList: SourceList = { id, name: name.trim(), sourceIds: [], createdAt: Date.now() }
    updateLists((prev) => [...prev, newList])
    fetch('/api/db/source-lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newList),
    }).catch(() => {})
    return id
  }, [updateLists])

  const deleteList = useCallback((id: string) => {
    updateLists((prev) => prev.filter((l) => l.id !== id))
    fetch(`/api/db/source-lists/${id}`, { method: 'DELETE' }).catch(() => {})
  }, [updateLists])

  const renameList = useCallback((id: string, name: string) => {
    updateLists((prev) => prev.map((l) => (l.id === id ? { ...l, name: name.trim() } : l)))
    fetch(`/api/db/source-lists/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    }).catch(() => {})
  }, [updateLists])

  const toggleSourceInList = useCallback((listId: string, sourceId: string) => {
    updateLists((prev) => prev.map((l) => {
      if (l.id !== listId) return l
      const has = l.sourceIds.includes(sourceId)
      const sourceIds = has ? l.sourceIds.filter((id) => id !== sourceId) : [...l.sourceIds, sourceId]
      fetch(`/api/db/source-lists/${listId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceIds }),
      }).catch(() => {})
      return { ...l, sourceIds }
    }))
  }, [updateLists])

  const isInList = useCallback(
    (listId: string, sourceId: string) => lists.find((l) => l.id === listId)?.sourceIds.includes(sourceId) ?? false,
    [lists]
  )

  return { sourceLists: lists, createSourceList: createList, deleteSourceList: deleteList, renameSourceList: renameList, toggleSourceInList, isInList }
}
