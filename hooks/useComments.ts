'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Comment } from '@/lib/types'
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
    persist('/api/db/comments', 'POST', { id: comment.id, entityId, text: comment.text, createdAt: comment.createdAt })
  }, [updateData])

  const deleteComment = useCallback((entityId: string, commentId: string) => {
    updateData((prev) => ({
      ...prev,
      [entityId]: (prev[entityId] ?? []).filter((c) => c.id !== commentId),
    }))
    persist(`/api/db/comments/${commentId}`, 'DELETE')
  }, [updateData])

  const editComment = useCallback((entityId: string, commentId: string, text: string) => {
    updateData((prev) => ({
      ...prev,
      [entityId]: (prev[entityId] ?? []).map((c) =>
        c.id === commentId ? { ...c, text: text.trim() } : c
      ),
    }))
    persist(`/api/db/comments/${commentId}`, 'PATCH', { text: text.trim() })
  }, [updateData])

  const getComments = useCallback(
    (entityId: string) => data[entityId] ?? [],
    [data]
  )

  return { addComment, deleteComment, editComment, getComments }
}
