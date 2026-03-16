'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Post } from '@/lib/types'

type ManualRecord = { feedId: string; post: Post; addedAt: number }

const LS_KEY = 'manual_posts_cache_v1'

function readCache(): ManualRecord[] | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ManualRecord[]
  } catch { return null }
}

function writeCache(records: ManualRecord[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(records)) } catch { /* ignore */ }
}

export function useManualPosts(feedId: string) {
  const [allPosts, setAllPosts] = useState<ManualRecord[]>(() => readCache() ?? [])

  const loadFromDB = useCallback(() => {
    fetch('/api/db/manual-posts')
      .then((r) => r.json())
      .then((data: ManualRecord[]) => {
        if (Array.isArray(data) && data.length > 0) {
          writeCache(data)
          setAllPosts(data)
        } else {
          const cached = readCache()
          if (cached && cached.length > 0) setAllPosts(cached)
        }
      })
      .catch(() => {
        const cached = readCache()
        if (cached) setAllPosts(cached)
      })
  }, [])

  useEffect(() => { loadFromDB() }, [loadFromDB])

  // Re-read when a post is restored from the archive
  useEffect(() => {
    window.addEventListener('manual-posts-updated', loadFromDB)
    return () => window.removeEventListener('manual-posts-updated', loadFromDB)
  }, [loadFromDB])

  const updatePosts = useCallback((updater: (prev: ManualRecord[]) => ManualRecord[]) => {
    setAllPosts((prev) => {
      const next = updater(prev)
      writeCache(next)
      return next
    })
  }, [])

  const posts: Post[] = allPosts.filter((r) => r.feedId === feedId).map((r) => r.post)

  const addPost = useCallback((post: Post) => {
    const addedAt = Date.now()
    updatePosts((prev) => [{ feedId, post, addedAt }, ...prev])
    fetch('/api/db/manual-posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedId, post, addedAt }),
    }).catch(() => {})
  }, [feedId, updatePosts])

  const removePost = useCallback((postId: string) => {
    updatePosts((prev) => prev.filter((r) => r.post.id !== postId))
    fetch(`/api/db/manual-posts/${postId}`, { method: 'DELETE' }).catch(() => {})
  }, [updatePosts])

  const movePost = useCallback((postId: string, toFeedId: string) => {
    updatePosts((prev) => prev.map((r) => r.post.id === postId ? { ...r, feedId: toFeedId } : r))
    fetch(`/api/db/manual-posts/${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedId: toFeedId }),
    }).catch(() => {})
  }, [updatePosts])

  return { posts, addPost, removePost, movePost }
}
