'use client'

import { useEffect, useCallback } from 'react'
import type { Post } from '@/lib/types'
import { persist } from '@/lib/persist'
import { lsGet, lsSet } from '@/lib/localStorage'
import { useCachedAPI } from '@/hooks/useCachedAPI'

type ManualRecord = { feedId: string; post: Post; addedAt: number }

import { LS_KEYS } from '@/lib/storageKeys'
const LS_KEY = LS_KEYS.MANUAL_POSTS

export function useManualPosts(feedId: string) {
  const [allPosts, setAllPosts] = useCachedAPI<ManualRecord[]>(
    '/api/db/manual-posts',
    LS_KEY,
    [],
  )

  // Re-read when a post is restored from the archive (event-driven re-fetch)
  const loadFromDB = useCallback(() => {
    fetch('/api/db/manual-posts')
      .then((r) => r.json())
      .then((data: ManualRecord[]) => {
        if (Array.isArray(data) && data.length > 0) {
          lsSet(LS_KEY, data)
          setAllPosts(data)
        } else {
          const cached = lsGet<ManualRecord[]>(LS_KEY)
          if (cached && cached.length > 0) setAllPosts(cached)
        }
      })
      .catch(() => {
        const cached = lsGet<ManualRecord[]>(LS_KEY)
        if (cached) setAllPosts(cached)
      })
  }, [setAllPosts])

  useEffect(() => {
    window.addEventListener('manual-posts-updated', loadFromDB)
    return () => window.removeEventListener('manual-posts-updated', loadFromDB)
  }, [loadFromDB])

  const updatePosts = useCallback((updater: (prev: ManualRecord[]) => ManualRecord[]) => {
    setAllPosts((prev) => {
      const next = updater(prev)
      lsSet(LS_KEY, next)
      return next
    })
  }, [])

  const posts: Post[] = allPosts.filter((r) => r.feedId === feedId).map((r) => r.post)

  const addPost = useCallback((post: Post) => {
    const addedAt = Date.now()
    updatePosts((prev) => [{ feedId, post, addedAt }, ...prev])
    persist('/api/db/manual-posts', 'POST', { feedId, post, addedAt })
  }, [feedId, updatePosts])

  const removePost = useCallback((postId: string) => {
    updatePosts((prev) => prev.filter((r) => r.post.id !== postId))
    persist(`/api/db/manual-posts/${postId}`, 'DELETE')
  }, [updatePosts])

  const movePost = useCallback((postId: string, toFeedId: string) => {
    updatePosts((prev) => prev.map((r) => r.post.id === postId ? { ...r, feedId: toFeedId } : r))
    persist(`/api/db/manual-posts/${postId}`, 'PATCH', { feedId: toFeedId })
  }, [updatePosts])

  return { posts, addPost, removePost, movePost }
}
