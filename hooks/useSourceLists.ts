'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SourceList } from '@/lib/types'

export function useSourceLists() {
  const [lists, setLists] = useState<SourceList[]>([])

  useEffect(() => {
    fetch('/api/db/source-lists')
      .then((r) => r.json())
      .then((data: SourceList[]) => setLists(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const createList = useCallback((name: string): string => {
    const id = Date.now().toString()
    const newList: SourceList = { id, name: name.trim(), sourceIds: [], createdAt: Date.now() }
    setLists((prev) => [...prev, newList])
    fetch('/api/db/source-lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newList),
    }).catch(() => {})
    return id
  }, [])

  const deleteList = useCallback((id: string) => {
    setLists((prev) => prev.filter((l) => l.id !== id))
    fetch(`/api/db/source-lists/${id}`, { method: 'DELETE' }).catch(() => {})
  }, [])

  const renameList = useCallback((id: string, name: string) => {
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, name: name.trim() } : l)))
    fetch(`/api/db/source-lists/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    }).catch(() => {})
  }, [])

  const toggleSourceInList = useCallback((listId: string, sourceId: string) => {
    setLists((prev) => {
      const next = prev.map((l) => {
        if (l.id !== listId) return l
        const has = l.sourceIds.includes(sourceId)
        const sourceIds = has ? l.sourceIds.filter((id) => id !== sourceId) : [...l.sourceIds, sourceId]
        fetch(`/api/db/source-lists/${listId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceIds }),
        }).catch(() => {})
        return { ...l, sourceIds }
      })
      return next
    })
  }, [])

  const isInList = useCallback(
    (listId: string, sourceId: string) => lists.find((l) => l.id === listId)?.sourceIds.includes(sourceId) ?? false,
    [lists]
  )

  return { sourceLists: lists, createSourceList: createList, deleteSourceList: deleteList, renameSourceList: renameList, toggleSourceInList, isInList }
}
