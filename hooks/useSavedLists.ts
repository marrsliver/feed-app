'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SavedList, Post } from '@/lib/types'

const LS_KEY = 'saved_lists_cache_v1'

function readCache(): SavedList[] | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SavedList[]
  } catch { return null }
}

function writeCache(lists: SavedList[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(lists)) } catch { /* ignore */ }
}

export function useSavedLists() {
  const [lists, setLists] = useState<SavedList[]>(() => readCache() ?? [])
  const [loaded, setLoaded] = useState(false)

  const refetch = useCallback(() => {
    fetch('/api/db/lists')
      .then((r) => r.json())
      .then((data: SavedList[]) => {
        if (Array.isArray(data) && data.length > 0) {
          writeCache(data)
          setLists(data)
        } else {
          const cached = readCache()
          if (cached && cached.length > 0) setLists(cached)
        }
        setLoaded(true)
      })
      .catch(() => {
        const cached = readCache()
        if (cached) setLists(cached)
        setLoaded(true)
      })
  }, [])

  useEffect(() => { refetch() }, [refetch])

  const updateLists = useCallback((updater: (prev: SavedList[]) => SavedList[]) => {
    setLists((prev) => {
      const next = updater(prev)
      writeCache(next)
      return next
    })
  }, [])

  const createList = useCallback((name: string): string => {
    const id = Date.now().toString()
    const newList: SavedList = { id, name: name.trim(), postIds: [], postData: {}, createdAt: Date.now() }
    updateLists((prev) => [...prev, newList])
    fetch('/api/db/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newList),
    }).catch(() => {})
    return id
  }, [updateLists])

  const deleteList = useCallback((id: string) => {
    updateLists((prev) => prev.filter((l) => l.id !== id))
    fetch(`/api/db/lists/${id}`, { method: 'DELETE' }).catch(() => {})
  }, [updateLists])

  const renameList = useCallback((id: string, name: string) => {
    updateLists((prev) => prev.map((l) => (l.id === id ? { ...l, name: name.trim() } : l)))
    fetch(`/api/db/lists/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    }).catch(() => {})
  }, [updateLists])

  const togglePostInList = useCallback((listId: string, postId: string, post?: Post) => {
    updateLists((prev) => prev.map((l) => {
      if (l.id !== listId) return l
      const has = l.postIds.includes(postId)
      const postIds = has ? l.postIds.filter((id) => id !== postId) : [...l.postIds, postId]
      const postData = { ...(l.postData ?? {}) }
      if (has) { delete postData[postId] } else if (post) { postData[postId] = post }
      fetch(`/api/db/lists/${listId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postIds, postData }),
      }).catch(() => {})
      return { ...l, postIds, postData }
    }))
  }, [updateLists])

  const isInList = useCallback(
    (listId: string, postId: string) => lists.find((l) => l.id === listId)?.postIds.includes(postId) ?? false,
    [lists]
  )

  const isInAnyList = useCallback(
    (postId: string) => lists.some((l) => l.postIds.includes(postId)),
    [lists]
  )

  return { lists, loaded, refetch, createList, deleteList, renameList, togglePostInList, isInList, isInAnyList }
}
