'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SavedList } from '@/lib/types'

export function useSavedLists() {
  const [lists, setLists] = useState<SavedList[]>([])

  useEffect(() => {
    fetch('/api/db/lists')
      .then((r) => r.json())
      .then((data: SavedList[]) => setLists(data))
      .catch(() => {})
  }, [])

  const createList = useCallback((name: string): string => {
    const id = Date.now().toString()
    const newList: SavedList = { id, name: name.trim(), postIds: [], createdAt: Date.now() }
    setLists((prev) => [...prev, newList])
    fetch('/api/db/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newList),
    }).catch(() => {})
    return id
  }, [])

  const deleteList = useCallback((id: string) => {
    setLists((prev) => prev.filter((l) => l.id !== id))
    fetch(`/api/db/lists/${id}`, { method: 'DELETE' }).catch(() => {})
  }, [])

  const renameList = useCallback((id: string, name: string) => {
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, name: name.trim() } : l)))
    fetch(`/api/db/lists/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    }).catch(() => {})
  }, [])

  const togglePostInList = useCallback((listId: string, postId: string) => {
    setLists((prev) => {
      const next = prev.map((l) => {
        if (l.id !== listId) return l
        const has = l.postIds.includes(postId)
        const postIds = has ? l.postIds.filter((id) => id !== postId) : [...l.postIds, postId]
        fetch(`/api/db/lists/${listId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postIds }),
        }).catch(() => {})
        return { ...l, postIds }
      })
      return next
    })
  }, [])

  const isInList = useCallback(
    (listId: string, postId: string) => lists.find((l) => l.id === listId)?.postIds.includes(postId) ?? false,
    [lists]
  )

  const isInAnyList = useCallback(
    (postId: string) => lists.some((l) => l.postIds.includes(postId)),
    [lists]
  )

  return { lists, createList, deleteList, renameList, togglePostInList, isInList, isInAnyList }
}
