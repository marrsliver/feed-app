'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Comment } from '@/lib/types'

const STORAGE_KEY = 'feed-comments'

function load(): Record<string, Comment[]> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return {}
}

function save(data: Record<string, Comment[]>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch { /* ignore */ }
}

export function useComments() {
  const [data, setData] = useState<Record<string, Comment[]>>({})

  useEffect(() => { setData(load()) }, [])

  const addComment = useCallback((postId: string, text: string) => {
    const comment: Comment = {
      id: Date.now().toString(),
      postId,
      text: text.trim(),
      createdAt: Date.now(),
    }
    setData((prev) => {
      const next = { ...prev, [postId]: [...(prev[postId] ?? []), comment] }
      save(next)
      return next
    })
  }, [])

  const deleteComment = useCallback((postId: string, commentId: string) => {
    setData((prev) => {
      const next = { ...prev, [postId]: (prev[postId] ?? []).filter((c) => c.id !== commentId) }
      save(next)
      return next
    })
  }, [])

  const editComment = useCallback((postId: string, commentId: string, text: string) => {
    setData((prev) => {
      const next = {
        ...prev,
        [postId]: (prev[postId] ?? []).map((c) =>
          c.id === commentId ? { ...c, text: text.trim() } : c
        ),
      }
      save(next)
      return next
    })
  }, [])

  const getComments = useCallback(
    (postId: string) => data[postId] ?? [],
    [data]
  )

  return { addComment, deleteComment, editComment, getComments }
}
