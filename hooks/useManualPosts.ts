'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Post } from '@/lib/types'

const STORAGE_KEY = 'feed-manual-posts'

function load(): Record<string, Post[]> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return {}
}

function save(data: Record<string, Post[]>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch { /* ignore */ }
}

export function useManualPosts(feedId: string) {
  const [data, setData] = useState<Record<string, Post[]>>({})

  useEffect(() => { setData(load()) }, [])

  const posts: Post[] = data[feedId] ?? []

  const addPost = useCallback((post: Post) => {
    setData((prev) => {
      const next = { ...prev, [feedId]: [post, ...(prev[feedId] ?? [])] }
      save(next)
      return next
    })
  }, [feedId])

  const removePost = useCallback((postId: string) => {
    setData((prev) => {
      const next = { ...prev, [feedId]: (prev[feedId] ?? []).filter((p) => p.id !== postId) }
      save(next)
      return next
    })
  }, [feedId])

  const movePost = useCallback((postId: string, toFeedId: string) => {
    // Read fresh from localStorage to avoid stale-state race conditions
    const current = load()
    const post = (current[feedId] ?? []).find((p) => p.id === postId)
    if (!post) return
    const next = {
      ...current,
      [feedId]: (current[feedId] ?? []).filter((p) => p.id !== postId),
      [toFeedId]: [post, ...(current[toFeedId] ?? [])],
    }
    save(next)
    setData(next)
  }, [feedId])

  return { posts, addPost, removePost, movePost }
}
