'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import type { LibrarySource, Post, SpaceItem } from '@/lib/types'

type HistoryEntry =
  | { type: 'source'; id: string }
  | { type: 'post'; post: Post }

export function usePanelStack(sources: LibrarySource[]) {
  const [openSourcePanelId, setOpenSourcePanelId] = useState<string | null>(null)
  const [openPostPanel, setOpenPostPanel] = useState<Post | null>(null)
  const [openPostPanelItem, setOpenPostPanelItem] = useState<SpaceItem | null>(null)
  const [panelHistory, setPanelHistory] = useState<HistoryEntry[]>([])

  // Keep refs to current state so callbacks don't go stale
  const openPostPanelRef = useRef(openPostPanel)
  const openSourcePanelIdRef = useRef(openSourcePanelId)
  const panelHistoryRef = useRef(panelHistory)
  useEffect(() => { openPostPanelRef.current = openPostPanel }, [openPostPanel])
  useEffect(() => { openSourcePanelIdRef.current = openSourcePanelId }, [openSourcePanelId])
  useEffect(() => { panelHistoryRef.current = panelHistory }, [panelHistory])

  const openSourcePanel = openSourcePanelId
    ? (sources.find((s) => s.id === openSourcePanelId) ?? null)
    : null

  // Open a source panel by ID. Pass skipHistory=true to not push current post onto stack.
  const openSource = useCallback((id: string, skipHistory = false) => {
    if (!skipHistory && openPostPanelRef.current) {
      setPanelHistory((h) => [...h, { type: 'post', post: openPostPanelRef.current! }])
    }
    setOpenSourcePanelId(id)
    setOpenPostPanel(null)
  }, [])

  // Open a post panel. Pass skipHistory=true to not push current source onto stack.
  const openPost = useCallback((post: Post | null, item?: SpaceItem, skipHistory = false) => {
    if (!skipHistory && post && openSourcePanelIdRef.current) {
      setPanelHistory((h) => [...h, { type: 'source', id: openSourcePanelIdRef.current! }])
    }
    setOpenPostPanel(post)
    setOpenPostPanelItem(item ?? null)
    if (post) setOpenSourcePanelId(null)
  }, [])

  // Navigate back one step in history. The optional checkSourceExists callback
  // lets the caller verify a source still exists before restoring it (remix page behavior).
  const back = useCallback((checkSourceExists?: (id: string) => boolean) => {
    const h = panelHistoryRef.current
    const last = h[h.length - 1]
    if (!last) {
      // No history — close everything
      setPanelHistory([])
      setOpenSourcePanelId(null)
      setOpenPostPanel(null)
      setOpenPostPanelItem(null)
      return
    }
    setPanelHistory(h.slice(0, -1))
    if (last.type === 'source') {
      if (!checkSourceExists || checkSourceExists(last.id)) {
        setOpenSourcePanelId(last.id)
        setOpenPostPanel(null)
      }
    } else {
      setOpenPostPanel(last.post)
      setOpenPostPanelItem(null)
      setOpenSourcePanelId(null)
    }
  }, [])

  const close = useCallback(() => {
    setPanelHistory([])
    setOpenSourcePanelId(null)
    setOpenPostPanel(null)
    setOpenPostPanelItem(null)
  }, [])

  return {
    openSourcePanelId,
    openSourcePanel,
    openPostPanel,
    openPostPanelItem,
    panelHistory,
    openSource,
    openPost,
    back,
    close,
  }
}
