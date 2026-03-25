'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Comment } from '@/lib/types'
import { persist } from '@/lib/persist'
import { lsGet, lsSet } from '@/lib/localStorage'

import { LS_KEYS } from '@/lib/storageKeys'
const LS_KEY = LS_KEYS.COMMENTS
type CommentsMap = Record<string, Comment[]>

// ── Module-level singleton — all useComments() instances share this state ──────
let _data: CommentsMap = {}
const _subscribers = new Set<(data: CommentsMap) => void>()
let _fetched = false

function setGlobalData(updater: (prev: CommentsMap) => CommentsMap) {
  _data = updater(_data)
  lsSet(LS_KEY, _data)
  _subscribers.forEach((fn) => fn(_data))
}

export function useComments() {
  const [data, setData] = useState<CommentsMap>(() => {
    // Seed from cache on first render before the fetch resolves
    if (Object.keys(_data).length === 0) {
      const cached = lsGet<CommentsMap>(LS_KEY)
      if (cached) _data = cached
    }
    return _data
  })

  // Subscribe to global updates
  useEffect(() => {
    _subscribers.add(setData)
    // Sync any state that changed between render and subscribe
    setData(_data)
    return () => { _subscribers.delete(setData) }
  }, [])

  // Fetch from API once across all instances
  useEffect(() => {
    if (_fetched) return
    _fetched = true
    fetch('/api/db/comments')
      .then((r) => r.json())
      .then((rows: unknown) => {
        if (!Array.isArray(rows)) {
          // Bad response — fall back to cache, allow retry next mount
          _fetched = false
          const cached = lsGet<CommentsMap>(LS_KEY)
          if (cached) setGlobalData(() => cached)
          return
        }
        const grouped: CommentsMap = {}
        for (const row of rows as { id: string; entity_id: string; text: string; created_at: number }[]) {
          const c: Comment = { id: row.id, postId: row.entity_id, text: row.text, createdAt: row.created_at }
          grouped[row.entity_id] = [...(grouped[row.entity_id] ?? []), c]
        }
        // Trust DB over cache; if DB returns empty and cache has data, keep cache
        if (Object.keys(grouped).length > 0) {
          setGlobalData(() => grouped)
        } else {
          const cached = lsGet<CommentsMap>(LS_KEY)
          if (cached && Object.keys(cached).length > 0) setGlobalData(() => cached)
        }
      })
      .catch(() => {
        // Network failure — reset so the next mounted instance can retry
        _fetched = false
        const cached = lsGet<CommentsMap>(LS_KEY)
        if (cached) setGlobalData(() => cached)
      })
  }, [])

  const addComment = useCallback((entityId: string, text: string): string => {
    const comment: Comment = {
      id: crypto.randomUUID(),
      postId: entityId,
      text: text.trim(),
      createdAt: Date.now(),
    }
    setGlobalData((prev) => ({ ...prev, [entityId]: [...(prev[entityId] ?? []), comment] }))
    persist('/api/db/comments', 'POST', { id: comment.id, entityId, text: comment.text, createdAt: comment.createdAt })
    return comment.id
  }, [])

  const deleteComment = useCallback((entityId: string, commentId: string) => {
    setGlobalData((prev) => ({
      ...prev,
      [entityId]: (prev[entityId] ?? []).filter((c) => c.id !== commentId),
    }))
    persist(`/api/db/comments/${commentId}`, 'DELETE')
  }, [])

  const editComment = useCallback((entityId: string, commentId: string, text: string) => {
    setGlobalData((prev) => ({
      ...prev,
      [entityId]: (prev[entityId] ?? []).map((c) =>
        c.id === commentId ? { ...c, text: text.trim() } : c
      ),
    }))
    persist(`/api/db/comments/${commentId}`, 'PATCH', { text: text.trim() })
  }, [])

  const getComments = useCallback(
    (entityId: string) => data[entityId] ?? [],
    [data]
  )

  return { addComment, deleteComment, editComment, getComments }
}
