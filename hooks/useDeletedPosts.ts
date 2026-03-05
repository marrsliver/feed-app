'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Post } from '@/lib/types'

const DELETED_KEY = 'feed-deleted-posts'
const MANUAL_KEY = 'feed-manual-posts'

export interface DeletedRecord {
  post: Post
  feedId: string
  wasManual: boolean
  deletedAt: number
}

function loadDeleted(): DeletedRecord[] {
  try {
    const s = localStorage.getItem(DELETED_KEY)
    if (s) return JSON.parse(s)
  } catch { /* ignore */ }
  return []
}

function saveDeleted(records: DeletedRecord[]) {
  try { localStorage.setItem(DELETED_KEY, JSON.stringify(records)) } catch { /* ignore */ }
}

function loadManual(): Record<string, Post[]> {
  try {
    const s = localStorage.getItem(MANUAL_KEY)
    if (s) return JSON.parse(s)
  } catch { /* ignore */ }
  return {}
}

function saveManual(data: Record<string, Post[]>) {
  try { localStorage.setItem(MANUAL_KEY, JSON.stringify(data)) } catch { /* ignore */ }
}

export function useDeletedPosts() {
  const [records, setRecords] = useState<DeletedRecord[]>([])

  useEffect(() => { setRecords(loadDeleted()) }, [])

  // IDs of fetched (non-manual) posts that have been hidden
  const hiddenIds = records.filter((r) => !r.wasManual).map((r) => r.post.id)

  const archivePost = useCallback((post: Post, feedId: string, wasManual: boolean) => {
    setRecords((prev) => {
      // Avoid duplicates
      if (prev.some((r) => r.post.id === post.id)) return prev
      const next = [{ post, feedId, wasManual, deletedAt: Date.now() }, ...prev]
      saveDeleted(next)
      return next
    })
  }, [])

  const restorePost = useCallback((postId: string) => {
    setRecords((prev) => {
      const record = prev.find((r) => r.post.id === postId)
      if (!record) return prev

      if (record.wasManual) {
        // Write back to the original feed's manual posts in localStorage
        const manualData = loadManual()
        const existing = manualData[record.feedId] ?? []
        if (!existing.some((p) => p.id === postId)) {
          manualData[record.feedId] = [record.post, ...existing]
          saveManual(manualData)
        }
        // Notify all Feed instances to re-read manual posts
        window.dispatchEvent(new CustomEvent('manual-posts-updated'))
      }
      // For fetched posts: removing from records removes from hiddenIds automatically

      const next = prev.filter((r) => r.post.id !== postId)
      saveDeleted(next)
      return next
    })
  }, [])

  return { deletedPosts: records, hiddenIds, archivePost, restorePost }
}
