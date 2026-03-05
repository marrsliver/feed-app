'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Post } from '@/lib/types'

export function useManualPosts(feedId: string) {
  const [allPosts, setAllPosts] = useState<{ feedId: string; post: Post; addedAt: number }[]>([])

  useEffect(() => {
    fetch('/api/db/manual-posts')
      .then((r) => r.json())
      .then((data: { feedId: string; post: Post; addedAt: number }[]) => setAllPosts(data))
      .catch(() => {})
  }, [])

  // Re-read when a post is restored from the archive
  useEffect(() => {
    const handler = () => {
      fetch('/api/db/manual-posts')
        .then((r) => r.json())
        .then((data: { feedId: string; post: Post; addedAt: number }[]) => setAllPosts(data))
        .catch(() => {})
    }
    window.addEventListener('manual-posts-updated', handler)
    return () => window.removeEventListener('manual-posts-updated', handler)
  }, [])

  const posts: Post[] = allPosts.filter((r) => r.feedId === feedId).map((r) => r.post)

  const addPost = useCallback((post: Post) => {
    const addedAt = Date.now()
    setAllPosts((prev) => [{ feedId, post, addedAt }, ...prev])
    fetch('/api/db/manual-posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedId, post, addedAt }),
    }).catch(() => {})
  }, [feedId])

  const removePost = useCallback((postId: string) => {
    setAllPosts((prev) => prev.filter((r) => r.post.id !== postId))
    fetch(`/api/db/manual-posts/${postId}`, { method: 'DELETE' }).catch(() => {})
  }, [])

  const movePost = useCallback((postId: string, toFeedId: string) => {
    setAllPosts((prev) => prev.map((r) => r.post.id === postId ? { ...r, feedId: toFeedId } : r))
    fetch(`/api/db/manual-posts/${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedId: toFeedId }),
    }).catch(() => {})
  }, [])

  return { posts, addPost, removePost, movePost }
}
