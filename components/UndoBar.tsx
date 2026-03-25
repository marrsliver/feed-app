'use client'
import { useEffect } from 'react'
import { useUndoStack } from '@/hooks/useUndoStack'
import { usePendingWrites } from '@/hooks/usePendingWrites'

export function UndoBar() {
  const { canUndo, undoLabel, undo } = useUndoStack()
  const { pendingCount, retrying, retry, dismissAll } = usePendingWrites()

  const hasPending = pendingCount > 0

  // Keyboard shortcut
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

  if (!canUndo && !hasPending) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto flex items-center gap-2">
      {canUndo && (
        <button
          onClick={undo}
          className="flex items-center gap-2 bg-black text-white text-xs px-3 py-2 shadow-lg hover:bg-black/80 transition-colors"
        >
          <span className="opacity-60">↩</span>
          <span>Undo: {undoLabel}</span>
          <kbd className="opacity-40 text-[10px] font-mono ml-1">⌘Z</kbd>
        </button>
      )}
      {hasPending && (
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
