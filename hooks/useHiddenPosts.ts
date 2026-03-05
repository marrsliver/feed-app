'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'feed-hidden-posts'

function load(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return []
}

function save(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch { /* ignore */ }
}

export function useHiddenPosts() {
  const [hiddenIds, setHiddenIds] = useState<string[]>([])

  useEffect(() => { setHiddenIds(load()) }, [])

  const hidePost = useCallback((postId: string) => {
    setHiddenIds((prev) => {
      if (prev.includes(postId)) return prev
      const next = [...prev, postId]
      save(next)
      return next
    })
  }, [])

  return { hiddenIds, hidePost }
}
