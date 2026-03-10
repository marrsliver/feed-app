'use client'

import { useState, useCallback, useEffect } from 'react'

const KEY = 'feed-read-posts'

function loadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

export function useReadPosts() {
  const [readIds, setReadIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    setReadIds(loadIds())
  }, [])

  const markRead = useCallback((postId: string) => {
    setReadIds((prev) => {
      if (prev.has(postId)) return prev
      const next = new Set(prev)
      next.add(postId)
      try {
        localStorage.setItem(KEY, JSON.stringify([...next]))
      } catch {}
      return next
    })
  }, [])

  const isRead = useCallback((postId: string) => readIds.has(postId), [readIds])

  return { isRead, markRead }
}
