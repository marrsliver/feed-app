'use client'

import { useCallback } from 'react'
import type { SourceList } from '@/lib/types'
import { persist } from '@/lib/persist'
import { lsSet } from '@/lib/localStorage'
import { useCachedAPI } from '@/hooks/useCachedAPI'

const LS_KEY = 'source_lists_cache_v1'

export function useSourceLists() {
  const [lists, setLists] = useCachedAPI<SourceList[]>(
    '/api/db/source-lists',
    LS_KEY,
    [],
  )

  const updateLists = useCallback((updater: (prev: SourceList[]) => SourceList[]) => {
    setLists((prev) => {
      const next = updater(prev)
      lsSet(LS_KEY, next)
      return next
    })
  }, [])

  const createList = useCallback((name: string): string => {
    const id = Date.now().toString()
    const newList: SourceList = { id, name: name.trim(), sourceIds: [], createdAt: Date.now() }
    updateLists((prev) => [...prev, newList])
    persist('/api/db/source-lists', 'POST', newList)
    return id
  }, [updateLists])

  const deleteList = useCallback((id: string) => {
    updateLists((prev) => prev.filter((l) => l.id !== id))
    persist(`/api/db/source-lists/${id}`, 'DELETE')
  }, [updateLists])

  const renameList = useCallback((id: string, name: string) => {
    updateLists((prev) => prev.map((l) => (l.id === id ? { ...l, name: name.trim() } : l)))
    persist(`/api/db/source-lists/${id}`, 'PATCH', { name: name.trim() })
  }, [updateLists])

  const toggleSourceInList = useCallback((listId: string, sourceId: string) => {
    updateLists((prev) => prev.map((l) => {
      if (l.id !== listId) return l
      const has = l.sourceIds.includes(sourceId)
      const sourceIds = has ? l.sourceIds.filter((id) => id !== sourceId) : [...l.sourceIds, sourceId]
      persist(`/api/db/source-lists/${listId}`, 'PATCH', { sourceIds })
      return { ...l, sourceIds }
    }))
  }, [updateLists])

  const isInList = useCallback(
    (listId: string, sourceId: string) => lists.find((l) => l.id === listId)?.sourceIds.includes(sourceId) ?? false,
    [lists]
  )

  return { sourceLists: lists, createSourceList: createList, deleteSourceList: deleteList, renameSourceList: renameList, toggleSourceInList, isInList }
}
