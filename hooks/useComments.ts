'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Comment } from '@/lib/types'

export function useComments() {
  const [data, setData] = useState<Record<string, Comment[]>>({})

  useEffect(() => {
    fetch('/api/db/comments')
      .then((r) => r.json())
      .then((rows: { id: string; entity_id: string; text: string; created_at: number }[]) => {
        const grouped: Record<string, Comment[]> = {}
        for (const row of rows) {
          const c: Comment = { id: row.id, postId: row.entity_id, text: row.text, createdAt: row.created_at }
          grouped[row.entity_id] = [...(grouped[row.entity_id] ?? []), c]
        }
        setData(grouped)
      })
      .catch(() => {})
  }, [])

  const addComment = useCallback((entityId: string, text: string) => {
    const comment: Comment = {
      id: Date.now().toString(),
      postId: entityId,
      text: text.trim(),
      createdAt: Date.now(),
    }
    // Optimistic update
    setData((prev) => ({ ...prev, [entityId]: [...(prev[entityId] ?? []), comment] }))
    // Persist
    fetch('/api/db/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: comment.id, entityId, text: comment.text, createdAt: comment.createdAt }),
    }).catch(() => {})
  }, [])

  const deleteComment = useCallback((entityId: string, commentId: string) => {
    setData((prev) => ({
      ...prev,
      [entityId]: (prev[entityId] ?? []).filter((c) => c.id !== commentId),
    }))
    fetch(`/api/db/comments/${commentId}`, { method: 'DELETE' }).catch(() => {})
  }, [])

  const editComment = useCallback((entityId: string, commentId: string, text: string) => {
    setData((prev) => ({
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
  }, [])

  const getComments = useCallback(
    (entityId: string) => data[entityId] ?? [],
    [data]
  )

  return { addComment, deleteComment, editComment, getComments }
}
