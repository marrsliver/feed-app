'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'feed-bookmarks'

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set())

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setBookmarks(new Set(JSON.parse(stored)))
    } catch {
      // ignore
    }
  }, [])

  const toggle = useCallback((id: string) => {
    setBookmarks((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  const isBookmarked = useCallback(
    (id: string) => bookmarks.has(id),
    [bookmarks]
  )

  return { bookmarks, toggle, isBookmarked }
}
