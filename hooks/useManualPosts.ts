'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Post } from '@/lib/types'
import { queueWrite, clearWrite } from '@/lib/pendingWrites'
import { notifyPendingWritesChanged } from './usePendingWrites'

function persist(url: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown) {
  const writeId = queueWrite(url, method, body)
  notifyPendingWritesChanged()
  fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
    .then((r) => { if (r.ok) { clearWrite(writeId); notifyPendingWritesChanged() } })
    .catch(() => { /* stays in queue until replayed */ })
}

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
