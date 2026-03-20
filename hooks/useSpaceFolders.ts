'use client'

import { useState, useCallback, useMemo } from 'react'
import type { SpaceFolder } from '@/lib/types'

const LS_KEY = 'space_folders_v1'
const SIDEBAR_KEY = 'sidebar_order_v1'

export type SidebarEntry = { type: 'folder' | 'space'; id: string }

function readFolders(): SpaceFolder[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') } catch { return [] }
}
function writeFolders(folders: SpaceFolder[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(folders)) } catch { /* ignore */ }
}
function readSidebarOrder(): SidebarEntry[] {
  try { return JSON.parse(localStorage.getItem(SIDEBAR_KEY) ?? '[]') } catch { return [] }
}
function writeSidebarOrder(order: SidebarEntry[]) {
  try { localStorage.setItem(SIDEBAR_KEY, JSON.stringify(order)) } catch { /* ignore */ }
}

export function useSpaceFolders() {
  const [allFolders, setAllFolders] = useState<SpaceFolder[]>(() => {
    if (typeof window === 'undefined') return []
    return readFolders()
  })

  const [sidebarOrder, setSidebarOrder] = useState<SidebarEntry[]>(() => {
    if (typeof window === 'undefined') return []
    return readSidebarOrder()
  })

  const folders = useMemo(() => allFolders.filter(f => !f.deletedAt), [allFolders])
  const trashedFolders = useMemo(() => allFolders.filter(f => !!f.deletedAt), [allFolders])

  const update = useCallback((updater: (prev: SpaceFolder[]) => SpaceFolder[]) => {
    setAllFolders((prev) => {
      const next = updater(prev)
      writeFolders(next)
      return next
    })
  }, [])

  const updateSidebarOrder = useCallback((entries: SidebarEntry[]) => {
    setSidebarOrder(entries)
    writeSidebarOrder(entries)
  }, [])

  const createFolder = useCallback((name: string): string => {
    const id = `folder-${Date.now()}`
    update((prev) => [...prev, { id, name: name.trim(), spaceIds: [], createdAt: Date.now() }])
    return id
  }, [update])

  const renameFolder = useCallback((id: string, name: string) => {
    update((prev) => prev.map((f) => f.id === id ? { ...f, name: name.trim() } : f))
  }, [update])

  // Soft-delete: moves to trash (spaceIds preserved for restore)
  const deleteFolder = useCallback((id: string) => {
    update((prev) => prev.map(f => f.id === id ? { ...f, deletedAt: Date.now() } : f))
    setSidebarOrder((prev) => {
      const next = prev.filter(e => !(e.type === 'folder' && e.id === id))
      writeSidebarOrder(next)
      return next
    })
  }, [update])

  const restoreFolder = useCallback((id: string) => {
    update((prev) => prev.map(f => f.id === id ? { ...f, deletedAt: undefined } : f))
  }, [update])

  const permanentDeleteFolder = useCallback((id: string) => {
    update((prev) => prev.filter(f => f.id !== id))
  }, [update])

  const addSpaceToFolder = useCallback((folderId: string, spaceId: string) => {
    update((prev) => prev.map((f) => {
      // Remove from other folders first
      if (f.id !== folderId) return f.spaceIds.includes(spaceId) ? { ...f, spaceIds: f.spaceIds.filter(id => id !== spaceId) } : f
      if (f.spaceIds.includes(spaceId)) return f
      return { ...f, spaceIds: [...f.spaceIds, spaceId] }
    }))
  }, [update])

  const removeSpaceFromFolder = useCallback((folderId: string, spaceId: string) => {
    update((prev) => prev.map((f) => f.id === folderId ? { ...f, spaceIds: f.spaceIds.filter(id => id !== spaceId) } : f))
  }, [update])

  // Returns folderId for a given spaceId, or null if not in any folder
  const getFolderForSpace = useCallback((spaceId: string): string | null => {
    const folder = folders.find(f => f.spaceIds.includes(spaceId))
    return folder?.id ?? null
  }, [folders])

  const reorderFolders = useCallback((orderedIds: string[]) => {
    update((prev) => {
      const nonDeleted = prev.filter(f => !f.deletedAt)
      const deleted = prev.filter(f => f.deletedAt)
      const byId = Object.fromEntries(nonDeleted.map(f => [f.id, f]))
      return [...orderedIds.map(id => byId[id]).filter(Boolean), ...deleted]
    })
  }, [update])

  return {
    folders,
    trashedFolders,
    createFolder, renameFolder, deleteFolder, restoreFolder, permanentDeleteFolder,
    addSpaceToFolder, removeSpaceFromFolder, getFolderForSpace, reorderFolders,
    sidebarOrder, updateSidebarOrder,
  }
}
