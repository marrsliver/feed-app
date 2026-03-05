'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Post } from '@/lib/types'

export interface DeletedRecord {
  post: Post
  feedId: string
  wasManual: boolean
  deletedAt: number
}

export function useDeletedPosts() {
  const [records, setRecords] = useState<DeletedRecord[]>([])

  useEffect(() => {
    fetch('/api/db/deleted-posts')
      .then((r) => r.json())
      .then((data: DeletedRecord[]) => setRecords(data))
      .catch(() => {})
  }, [])

  const hiddenIds = records.filter((r) => !r.wasManual).map((r) => r.post.id)

  const archivePost = useCallback((post: Post, feedId: string, wasManual: boolean) => {
    const deletedAt = Date.now()
    setRecords((prev) => {
      if (prev.some((r) => r.post.id === post.id)) return prev
      return [{ post, feedId, wasManual, deletedAt }, ...prev]
    })
    fetch('/api/db/deleted-posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post, feedId, wasManual, deletedAt }),
    }).catch(() => {})
  }, [])

  const restorePost = useCallback((postId: string) => {
    setRecords((prev) => {
      const record = prev.find((r) => r.post.id === postId)
      if (!record) return prev

      if (record.wasManual) {
        // Re-add to manual posts via API
        fetch('/api/db/manual-posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feedId: record.feedId, post: record.post, addedAt: Date.now() }),
        })
          .then(() => window.dispatchEvent(new CustomEvent('manual-posts-updated')))
          .catch(() => {})
      }

      fetch(`/api/db/deleted-posts/${postId}`, { method: 'DELETE' }).catch(() => {})
      return prev.filter((r) => r.post.id !== postId)
    })
  }, [])

  return { deletedPosts: records, hiddenIds, archivePost, restorePost }
}
