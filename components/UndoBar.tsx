'use client'
import { useEffect, useRef, useState } from 'react'
import { useUndoStack } from '@/hooks/useUndoStack'
import { usePendingWrites } from '@/hooks/usePendingWrites'

// How long the undo bar stays visible after the last action (ms)
const UNDO_VISIBLE_MS = 5000
// How long a write must be stuck before the amber pill appears (ms)
const PENDING_DEBOUNCE_MS = 1500

export function UndoBar() {
  const { canUndo, undoLabel, undo } = useUndoStack()
  const { pendingCount, retrying, retry, dismissAll } = usePendingWrites()

  // Auto-hide undo bar 5 s after the most recent action
  const [undoVisible, setUndoVisible] = useState(false)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => {
    if (canUndo) {
      setUndoVisible(true)
      clearTimeout(undoTimerRef.current)
      undoTimerRef.current = setTimeout(() => setUndoVisible(false), UNDO_VISIBLE_MS)
    } else {
      setUndoVisible(false)
    }
    return () => clearTimeout(undoTimerRef.current)
  }, [canUndo, undoLabel]) // re-arm whenever a new action is pushed

  // Debounce the amber pill — only show if writes are stuck for > 1.5 s
  const [pendingVisible, setPendingVisible] = useState(false)
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => {
    if (pendingCount > 0) {
      pendingTimerRef.current = setTimeout(() => setPendingVisible(true), PENDING_DEBOUNCE_MS)
    } else {
      clearTimeout(pendingTimerRef.current)
      setPendingVisible(false)
    }
    return () => clearTimeout(pendingTimerRef.current)
  }, [pendingCount])

  // Keyboard shortcut — always active regardless of visibility
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo])

  if (!undoVisible && !pendingVisible) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto flex items-center gap-2">
      {undoVisible && canUndo && (
        <button
          onClick={undo}
          className="flex items-center gap-2 bg-black text-white text-xs px-3 py-2 shadow-lg hover:bg-black/80 transition-colors"
        >
          <span className="opacity-60">↩</span>
          <span>Undo: {undoLabel}</span>
          <kbd className="opacity-40 text-[10px] font-mono ml-1">⌘Z</kbd>
        </button>
      )}
      {pendingVisible && (
        <div className="flex items-center bg-amber-600 text-white text-xs shadow-lg">
          <button
            onClick={retry}
            disabled={retrying}
            className="px-3 py-2 hover:bg-amber-700 transition-colors disabled:opacity-60"
          >
            {retrying ? 'Syncing…' : `${pendingCount} unsaved — retry`}
          </button>
          <button
            onClick={dismissAll}
            className="px-2 py-2 opacity-60 hover:opacity-100 transition-opacity border-l border-amber-500"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
