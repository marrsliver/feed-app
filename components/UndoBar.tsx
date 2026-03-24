'use client'
import { useEffect } from 'react'
import { useUndoStack } from '@/hooks/useUndoStack'

export function UndoBar() {
  const { canUndo, undoLabel, undo } = useUndoStack()

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

  if (!canUndo) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
      <button
        onClick={undo}
        className="flex items-center gap-2 bg-black text-white text-xs px-3 py-2 shadow-lg hover:bg-black/80 transition-colors"
      >
        <span className="opacity-60">↩</span>
        <span>Undo: {undoLabel}</span>
        <kbd className="opacity-40 text-[10px] font-mono ml-1">⌘Z</kbd>
      </button>
    </div>
  )
}
