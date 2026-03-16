'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Comment } from '@/lib/types'

const LS_KEY = 'comments_cache_v1'

type CommentsMap = Record<string, Comment[]>

function readCache(): CommentsMap | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CommentsMap
  } catch { return null }
}

function writeCache(data: CommentsMap) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)) } catch { /* ignore */ }
}

export function useComments() {
  const [data, setData] = useState<CommentsMap>(() => readCache() ?? {})

  useEffect(() => {
    fetch('/api/db/comments')
      .then((r) => r.json())
      .then((rows: { id: string; entity_id: string; text: string; created_at: number }[]) => {
        if (!Array.isArray(rows)) {
          const cached = readCache()
          if (cached) setData(cached)
          return
        }
        const grouped: CommentsMap = {}
        for (const row of rows) {
          const c: Comment = { id: row.id, postId: row.entity_id, text: row.text, createdAt: row.created_at }
          grouped[row.entity_id] = [...(grouped[row.entity_id] ?? []), c]
        }
        if (rows.length > 0) {
          writeCache(grouped)
          setData(grouped)
        } else {
          const cached = readCache()
          if (cached && Object.keys(cached).length > 0) setData(cached)
        }
      })
      .catch(() => {
        const cached = readCache()
        if (cached) setData(cached)
      })
  }, [])

  const updateData = useCallback((updater: (prev: CommentsMap) => CommentsMap) => {
    setData((prev) => {
      const next = updater(prev)
      writeCache(next)
      return next
    })
  }, [])

  const addComment = useCallback((entityId: string, text: string) => {
    const comment: Comment = {
      id: crypto.randomUUID(),
      postId: entityId,
      text: text.trim(),
      createdAt: Date.now(),
    }
    updateData((prev) => ({ ...prev, [entityId]: [...(prev[entityId] ?? []), comment] }))
    fetch('/api/db/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: comment.id, entityId, text: comment.text, createdAt: comment.createdAt }),
    }).catch(() => {})
  }, [updateData])

  const deleteComment = useCallback((entityId: string, commentId: string) => {
    updateData((prev) => ({
      ...prev,
      [entityId]: (prev[entityId] ?? []).filter((c) => c.id !== commentId),
    }))
    fetch(`/api/db/comments/${commentId}`, { method: 'DELETE' }).catch(() => {})
  }, [updateData])

  const editComment = useCallback((entityId: string, commentId: string, text: string) => {
    updateData((prev) => ({
      ...prev,
      [entityId]: (prev[entityId] ?? []).map((c) =>
        c.id === commentId ? { ...c, text: text.trim() } : c
      ),
    }))
    fetch(`/api/db/comments/${commentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim() }),
    }).catch(() => {})
  }, [updateData])

  const getComments = useCallback(
    (entityId: string) => data[entityId] ?? [],
    [data]
  )

  return { addComment, deleteComment, editComment, getComments }
}
