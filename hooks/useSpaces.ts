'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type { Space, SpaceItem, Post } from '@/lib/types'
import { persist } from '@/lib/persist'
import { lsGet, lsSet } from '@/lib/localStorage'

const LS_KEY = 'saved_lists_cache_v1'
const TRASH_KEY = 'spaces_trash_v1'
const DELETED_IDS_KEY = 'spaces_deleted_ids_v1'

function readTrash(): Space[] {
  return lsGet<Space[]>(TRASH_KEY) ?? []
}
function writeTrash(s: Space[]) {
  lsSet(TRASH_KEY, s)
}

function readDeletedIds(): Set<string> {
  return new Set(lsGet<string[]>(DELETED_IDS_KEY) ?? [])
}
function writeDeletedIds(ids: Set<string>) {
  lsSet(DELETED_IDS_KEY, [...ids])
}

// Cross-instance sync: all useSpaces() instances share state via a custom event.
// Deferred with setTimeout to avoid "setState during render" when the event fires
// synchronously inside a setSpaces updater (e.g. patchSpace called mid-render).
const SPACES_EVENT = 'spaces-updated'
function notifySpacesChanged(spaces: Space[]) {
  if (typeof window === 'undefined') return
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent(SPACES_EVENT, { detail: spaces }))
  }, 0)
}

function makeItemId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function migrateSpace(space: Space): Space {
  if (!space.postIds?.length || space.items.length > 0) return space
  const items: SpaceItem[] = space.postIds.map((postId) => ({
    type: 'post' as const,
    id: makeItemId(),
    refId: postId,
    postData: space.postData?.[postId],
    addedAt: space.createdAt,
  }))
  return { ...space, items, postIds: [], postData: {} }
}

// Mutate spaces and persist — side-effect-free updater pattern
// persist is called OUTSIDE setSpaces to avoid setState-during-render warnings
function applyUpdate(
  spaces: Space[],
  spaceId: string,
  mutate: (s: Space) => Space
): Space[] {
  return spaces.map((s) => (s.id === spaceId ? mutate(s) : s))
}

export function useSpaces() {
  const [spaces, setSpaces] = useState<Space[]>(() => {
    const deletedIds = readDeletedIds()
    return (lsGet<Space[]>(LS_KEY) ?? []).map(migrateSpace).filter((s) => !deletedIds.has(s.id))
  })
  const [trashedSpaces, setTrashedSpaces] = useState<Space[]>(() => readTrash())
  const [loaded, setLoaded] = useState(false)
  // Ref for current spaces — lets mutations compute new state without reading stale closures
  const spacesRef = useRef(spaces)
  useEffect(() => { spacesRef.current = spaces }, [spaces])

  // Subscribe to cross-instance updates (e.g. BookmarkButton ↔ PostPanel staying in sync)
  useEffect(() => {
    function onUpdate(e: Event) {
      const updated = (e as CustomEvent<Space[]>).detail
      setSpaces(updated)
    }
    window.addEventListener(SPACES_EVENT, onUpdate)
    return () => window.removeEventListener(SPACES_EVENT, onUpdate)
  }, [])

  const refetch = useCallback(() => {
    fetch('/api/db/lists')
      .then((r) => r.json())
      .then((data: Space[]) => {
        if (Array.isArray(data) && data.length > 0) {
          // Preserve locally-stored tags (not yet in DB)
          const localTags: Record<string, string[]> = {}
          const cached = lsGet<Space[]>(LS_KEY)
          if (cached) cached.forEach((s) => { if (s.tags?.length) localTags[s.id] = s.tags })
          const migrated = data.map((d) => migrateSpace({ ...d, tags: localTags[d.id] ?? d.tags ?? [] }))
          // Persist any migrated spaces
          data.forEach((orig, i) => {
            const s = migrated[i]
            if (orig.postIds?.length && s.items.length > 0 && !s.postIds?.length) {
              persist(`/api/db/lists/${s.id}`, 'PATCH', { items: s.items, postIds: [], updatedAt: Date.now() })
            }
          })
          const deletedIds = readDeletedIds()
          const active = migrated.filter((s) => !deletedIds.has(s.id))
          lsSet(LS_KEY, active)
          setSpaces(active)
        } else {
          const cached = lsGet<Space[]>(LS_KEY)
          if (cached && cached.length > 0) {
            const deletedIds = readDeletedIds()
            setSpaces(cached.map(migrateSpace).filter((s) => !deletedIds.has(s.id)))
          }
        }
        setLoaded(true)
      })
      .catch(() => {
        const cached = lsGet<Space[]>(LS_KEY)
        if (cached) setSpaces(cached.map(migrateSpace))
        setLoaded(true)
      })
  }, [])

  useEffect(() => { refetch() }, [refetch])

  // Pure updater — no side effects inside
  const patchSpace = useCallback((spaceId: string, mutate: (s: Space) => Space) => {
    setSpaces((prev) => {
      const next = applyUpdate(prev, spaceId, mutate)
      lsSet(LS_KEY, next)
      notifySpacesChanged(next)
      return next
    })
  }, [])

  const createSpace = useCallback((name: string): string => {
    const id = Date.now().toString()
    const newSpace: Space = { id, name: name.trim(), items: [], createdAt: Date.now() }
    spacesRef.current = [...spacesRef.current, newSpace]
    setSpaces((prev) => { const next = [...prev, newSpace]; lsSet(LS_KEY, next); notifySpacesChanged(next); return next })
    persist('/api/db/lists', 'POST', newSpace)
    return id
  }, [])

  // Soft-delete: moves to trash, doesn't call DB delete yet
  const deleteSpace = useCallback((id: string) => {
    const space = spacesRef.current.find((s) => s.id === id)
    if (!space) return
    const deleted = { ...space, deletedAt: Date.now() }
    const newTrash = [deleted, ...readTrash()]
    writeTrash(newTrash)
    setTrashedSpaces(newTrash)
    const ids = readDeletedIds(); ids.add(id); writeDeletedIds(ids)
    setSpaces((prev) => { const next = prev.filter((s) => s.id !== id); lsSet(LS_KEY, next); notifySpacesChanged(next); return next })
  }, [])

  const restoreSpace = useCallback((id: string) => {
    const trashed = readTrash()
    const space = trashed.find((s) => s.id === id)
    if (!space) return
    const { deletedAt: _, ...restored } = space
    const newTrash = trashed.filter((s) => s.id !== id)
    writeTrash(newTrash)
    setTrashedSpaces(newTrash)
    const ids = readDeletedIds(); ids.delete(id); writeDeletedIds(ids)
    setSpaces((prev) => { const next = [...prev, restored]; lsSet(LS_KEY, next); notifySpacesChanged(next); return next })
  }, [])

  const permanentDeleteSpace = useCallback((id: string) => {
    const newTrash = readTrash().filter((s) => s.id !== id)
    writeTrash(newTrash)
    setTrashedSpaces(newTrash)
    const ids = readDeletedIds(); ids.delete(id); writeDeletedIds(ids)
    persist(`/api/db/lists/${id}`, 'DELETE')
  }, [])

  const renameSpace = useCallback((id: string, name: string) => {
    patchSpace(id, (s) => ({ ...s, name: name.trim() }))
    persist(`/api/db/lists/${id}`, 'PATCH', { name: name.trim() })
  }, [patchSpace])

  const updateDescription = useCallback((id: string, description: string) => {
    const updatedAt = Date.now()
    patchSpace(id, (s) => ({ ...s, description, updatedAt }))
    persist(`/api/db/lists/${id}`, 'PATCH', { description, updatedAt })
  }, [patchSpace])

  // Helper — compute new items for a space and persist, outside the updater
  const mutateItems = useCallback((spaceId: string, mutate: (items: SpaceItem[]) => SpaceItem[]) => {
    const current = spacesRef.current.find((s) => s.id === spaceId)
    if (!current) return
    const items = mutate(current.items)
    const updatedAt = Date.now()
    patchSpace(spaceId, (s) => ({ ...s, items, updatedAt }))
    persist(`/api/db/lists/${spaceId}`, 'PATCH', { items, updatedAt })
  }, [patchSpace])

  const addPost = useCallback((spaceId: string, post: Post, extra?: { sourceRef?: string; cardRef?: string }) => {
    const id = makeItemId()
    mutateItems(spaceId, (items) => [
      ...items,
      { type: 'post' as const, id, copyGroupId: id, refId: post.id, postData: post, addedAt: Date.now(), ...extra },
    ])
  }, [mutateItems])

  const addNote = useCallback((spaceId: string, content: string, meta?: { sourceRef?: string; postRef?: Post; copyGroupId?: string; commentId?: string }) => {
    const id = makeItemId()
    mutateItems(spaceId, (items) => [
      ...items,
      { type: 'note' as const, id, content, copyGroupId: meta?.copyGroupId ?? id, sourceRef: meta?.sourceRef, postRef: meta?.postRef, commentId: meta?.commentId, addedAt: Date.now() },
    ])
  }, [mutateItems])

  // Appends a pre-built item (used for copy/move)
  const appendItem = useCallback((spaceId: string, item: SpaceItem) => {
    mutateItems(spaceId, (items) => [...items, item])
  }, [mutateItems])

  const addSource = useCallback((spaceId: string, sourceId: string) => {
    const id = makeItemId()
    mutateItems(spaceId, (items) => [
      ...items,
      { type: 'source' as const, id, copyGroupId: id, refId: sourceId, addedAt: Date.now() },
    ])
  }, [mutateItems])

  const addMedia = useCallback((spaceId: string, url: string, mediaType: 'image' | 'video' | 'audio') => {
    const id = makeItemId()
    mutateItems(spaceId, (items) => [
      ...items,
      { type: 'media' as const, id, copyGroupId: id, content: url, mediaType, addedAt: Date.now() },
    ])
  }, [mutateItems])

  const nestSpace = useCallback((parentId: string, childId: string) => {
    mutateItems(parentId, (items) => [
      ...items,
      { type: 'space' as const, id: makeItemId(), refId: childId, addedAt: Date.now() },
    ])
  }, [mutateItems])

  const removeItem = useCallback((spaceId: string, itemId: string) => {
    mutateItems(spaceId, (items) => items.filter((i) => i.id !== itemId))
  }, [mutateItems])

  const reorderItems = useCallback((spaceId: string, newItems: SpaceItem[]) => {
    const updatedAt = Date.now()
    patchSpace(spaceId, (s) => ({ ...s, items: newItems, updatedAt }))
    persist(`/api/db/lists/${spaceId}`, 'PATCH', { items: newItems, updatedAt })
  }, [patchSpace])

  const updateItem = useCallback((spaceId: string, itemId: string, updates: Partial<SpaceItem>) => {
    mutateItems(spaceId, (items) =>
      items.map((i) => (i.id === itemId ? { ...i, ...updates } : i))
    )
  }, [mutateItems])

  // Backward compat for BookmarkButton
  const togglePostInList = useCallback((listId: string, postId: string, post?: Post) => {
    const current = spacesRef.current.find((s) => s.id === listId)
    if (!current) return
    const existing = current.items.find((i) => i.type === 'post' && i.refId === postId)
    if (existing) {
      mutateItems(listId, (items) => items.filter((i) => i.id !== existing.id))
    } else {
      mutateItems(listId, (items) => [
        ...items,
        { type: 'post' as const, id: makeItemId(), refId: postId, postData: post, addedAt: Date.now() },
      ])
    }
  }, [mutateItems])

  const isInList = useCallback(
    (listId: string, postId: string) =>
      spaces.find((s) => s.id === listId)?.items.some((i) => i.type === 'post' && i.refId === postId) ?? false,
    [spaces]
  )

  const isInAnyList = useCallback(
    (postId: string) => spaces.some((s) => s.items.some((i) => i.type === 'post' && i.refId === postId)),
    [spaces]
  )

  // Tags are stored locally (localStorage) only. Add a `tags text[] default '{}'` column
  // in Supabase to persist them server-side.
  const updateSpaceTags = useCallback((id: string, tags: string[]) => {
    patchSpace(id, (s) => ({ ...s, tags }))
  }, [patchSpace])

  // Update matching items across ALL spaces by copyGroupId
  const updateItemByGroupId = useCallback((copyGroupId: string, updates: Partial<SpaceItem>) => {
    for (const space of spacesRef.current) {
      if (space.items.some(i => (i.copyGroupId ?? i.id) === copyGroupId)) {
        mutateItems(space.id, (items) =>
          items.map(i => (i.copyGroupId ?? i.id) === copyGroupId ? { ...i, ...updates } : i)
        )
      }
    }
  }, [mutateItems])

  // Map from post ID → array of {id, name} spaces that contain it
  // Updated only when spaces change — avoids O(n×m) recompute in consumers
  const postToSpaces = useMemo(() => {
    const map: Record<string, { id: string; name: string }[]> = {}
    for (const space of spaces) {
      if (space.deletedAt) continue
      for (const item of space.items) {
        // Index by postData.id (for posts)
        if (item.postData?.id) {
          const key = item.postData.id
          if (!map[key]) map[key] = []
          if (!map[key].some(s => s.id === space.id))
            map[key].push({ id: space.id, name: space.name })
        }
        // Also index by refId so both lookup strategies work
        if (item.type === 'post' && item.refId && item.refId !== item.postData?.id) {
          const key = item.refId
          if (!map[key]) map[key] = []
          if (!map[key].some(s => s.id === space.id))
            map[key].push({ id: space.id, name: space.name })
        }
      }
    }
    return map
  }, [spaces])

  // Map from comment ID → array of {id, name} spaces that have a note for that comment
  const commentToSpaces = useMemo(() => {
    const map: Record<string, { id: string; name: string }[]> = {}
    for (const space of spaces) {
      if (space.deletedAt) continue
      for (const item of space.items) {
        if (item.type === 'note' && item.commentId) {
          const key = item.commentId
          if (!map[key]) map[key] = []
          if (!map[key].some(s => s.id === space.id))
            map[key].push({ id: space.id, name: space.name })
        }
      }
    }
    return map
  }, [spaces])

  return {
    spaces,
    lists: spaces,
    loaded,
    refetch,
    createSpace,
    deleteSpace,
    restoreSpace,
    permanentDeleteSpace,
    trashedSpaces,
    renameSpace,
    updateDescription,
    addPost,
    addNote,
    addSource,
    addMedia,
    nestSpace,
    removeItem,
    reorderItems,
    updateItem,
    appendItem,
    togglePostInList,
    isInList,
    isInAnyList,
    updateSpaceTags,
    updateItemByGroupId,
    postToSpaces,
    commentToSpaces,
    // legacy aliases
    createList: createSpace,
    deleteList: deleteSpace,
    renameList: renameSpace,
  }
}
