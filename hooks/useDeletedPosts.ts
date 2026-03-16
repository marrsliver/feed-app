'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Post } from '@/lib/types'

export interface DeletedRecord {
  post: Post
  feedId: string
  wasManual: boolean
  deletedAt: number
}

const LS_KEY = 'deleted_posts_cache_v1'

function readCache(): DeletedRecord[] | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    return JSON.parse(raw) as DeletedRecord[]
  } catch { return null }
}

function writeCache(records: DeletedRecord[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(records)) } catch { /* ignore */ }
}

export function useDeletedPosts() {
  const [records, setRecords] = useState<DeletedRecord[]>(() => readCache() ?? [])

  useEffect(() => {
    fetch('/api/db/deleted-posts')
      .then((r) => r.json())
      .then((data: DeletedRecord[]) => {
        if (Array.isArray(data) && data.length > 0) {
          writeCache(data)
          setRecords(data)
        } else {
          const cached = readCache()
          if (cached && cached.length > 0) setRecords(cached)
        }
      })
      .catch(() => {
        const cached = readCache()
        if (cached) setRecords(cached)
      })
  }, [])

  const updateRecords = useCallback((updater: (prev: DeletedRecord[]) => DeletedRecord[]) => {
    setRecords((prev) => {
      const next = updater(prev)
      writeCache(next)
      return next
    })
  }, [])

  const hiddenIds = records.filter((r) => !r.wasManual).map((r) => r.post.id)

  const archivePost = useCallback((post: Post, feedId: string, wasManual: boolean) => {
    const deletedAt = Date.now()
    updateRecords((prev) => {
      if (prev.some((r) => r.post.id === post.id)) return prev
      return [{ post, feedId, wasManual, deletedAt }, ...prev]
    })
    fetch('/api/db/deleted-posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post, feedId, wasManual, deletedAt }),
    }).catch(() => {})
  }, [updateRecords])

  const restorePost = useCallback((postId: string) => {
    updateRecords((prev) => {
      const record = prev.find((r) => r.post.id === postId)
      if (!record) return prev
      if (record.wasManual) {
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
  }, [updateRecords])

  return { deletedPosts: records, hiddenIds, archivePost, restorePost }
}
