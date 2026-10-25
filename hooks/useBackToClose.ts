'use client'

import { useEffect, useRef } from 'react'

// Lets the phone's back button / back-swipe close an open sheet instead of leaving the page.
// Each open sheet pushes one history entry tagged with its depth, so nested sheets
// close one at a time.
// A reload keeps history.state, so a sheet that was open before reloading leaves a
// stale depth on the current entry. Clear it before the first sheet of this page load.
let normalized = false
function clearStaleDepth() {
  if (normalized) return
  normalized = true
  const state = window.history.state
  if (state?.sheetDepth) {
    const { sheetDepth: _stale, ...rest } = state
    window.history.replaceState(rest, '')
  }
}

export function useBackToClose(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  // Survives React StrictMode's unmount/remount so we don't pop and re-push the entry
  const entry = useRef<{ depth: number; timer?: number } | null>(null)

  useEffect(() => {
    if (!open) return
    let depth: number
    if (entry.current?.timer !== undefined) {
      clearTimeout(entry.current.timer)
      depth = entry.current.depth
    } else {
      clearStaleDepth()
      depth = ((window.history.state?.sheetDepth as number | undefined) ?? 0) + 1
      window.history.pushState({ ...window.history.state, sheetDepth: depth }, '')
    }
    const current = { depth } as { depth: number; timer?: number }
    entry.current = current

    function onPop() {
      const now = (window.history.state?.sheetDepth as number | undefined) ?? 0
      if (now < depth) onCloseRef.current()
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      current.timer = window.setTimeout(() => {
        entry.current = null
        // Closed from the UI — drop our history entry
        if (window.history.state?.sheetDepth === depth) window.history.back()
      }, 0)
    }
  }, [open])
}
