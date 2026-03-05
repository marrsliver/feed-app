'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SavedList } from '@/lib/types'

const STORAGE_KEY = 'feed-saved-lists'

function load(): SavedList[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {
    // ignore
  }
  return []
}

function save(lists: SavedList[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lists))
  } catch {
    // ignore
  }
}

export function useSavedLists() {
  const [lists, setLists] = useState<SavedList[]>([])

  useEffect(() => {
    setLists(load())
  }, [])

  const createList = useCallback((name: string): string => {
    const id = Date.now().toString()
    const newList: SavedList = { id, name: name.trim(), postIds: [], createdAt: Date.now() }
    setLists((prev) => {
      const next = [...prev, newList]
      save(next)
      return next
    })
    return id
  }, [])

  const deleteList = useCallback((id: string) => {
    setLists((prev) => {
      const next = prev.filter((l) => l.id !== id)
      save(next)
      return next
    })
  }, [])

  const renameList = useCallback((id: string, name: string) => {
    setLists((prev) => {
      const next = prev.map((l) => (l.id === id ? { ...l, name: name.trim() } : l))
      save(next)
      return next
    })
  }, [])

  const togglePostInList = useCallback((listId: string, postId: string) => {
    setLists((prev) => {
      const next = prev.map((l) => {
        if (l.id !== listId) return l
        const has = l.postIds.includes(postId)
        return {
          ...l,
          postIds: has ? l.postIds.filter((id) => id !== postId) : [...l.postIds, postId],
        }
      })
      save(next)
      return next
    })
  }, [])

  const isInList = useCallback(
    (listId: string, postId: string) => {
      const list = lists.find((l) => l.id === listId)
      return list ? list.postIds.includes(postId) : false
    },
    [lists]
  )

  const isInAnyList = useCallback(
    (postId: string) => lists.some((l) => l.postIds.includes(postId)),
    [lists]
  )

  return { lists, createList, deleteList, renameList, togglePostInList, isInList, isInAnyList }
}
