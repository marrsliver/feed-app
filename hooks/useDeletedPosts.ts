'use client'

import { useCallback } from 'react'
import type { Post } from '@/lib/types'
import { persist } from '@/lib/persist'
import { lsSet } from '@/lib/localStorage'
import { useCachedAPI } from '@/hooks/useCachedAPI'

export interface DeletedRecord {
  post: Post
  feedId: string
  wasManual: boolean
  deletedAt: number
}

import { LS_KEYS } from '@/lib/storageKeys'
const LS_KEY = LS_KEYS.DELETED_POSTS

export function useDeletedPosts() {
  const [records, setRecords] = useCachedAPI<DeletedRecord[]>(
    '/api/db/deleted-posts',
    LS_KEY,
    [],
  )

  const updateRecords = useCallback((updater: (prev: DeletedRecord[]) => DeletedRecord[]) => {
    setRecords((prev) => {
      const next = updater(prev)
      lsSet(LS_KEY, next)
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
    persist('/api/db/deleted-posts', 'POST', { post, feedId, wasManual, deletedAt })
  }, [updateRecords])

  const restorePost = useCallback((postId: string) => {
    updateRecords((prev) => {
      const record = prev.find((r) => r.post.id === postId)
      if (!record) return prev
      if (record.wasManual) {
        persist('/api/db/manual-posts', 'POST', { feedId: record.feedId, post: record.post, addedAt: Date.now() })
        window.dispatchEvent(new CustomEvent('manual-posts-updated'))
      }
      persist(`/api/db/deleted-posts/${postId}`, 'DELETE')
      return prev.filter((r) => r.post.id !== postId)
    })
  }, [updateRecords])

  return { deletedPosts: records, hiddenIds, archivePost, restorePost }
}
