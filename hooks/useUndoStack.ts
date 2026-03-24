'use client'
import { useState, useEffect, useCallback } from 'react'
import { peekUndo, popUndo, subscribeUndo } from '@/lib/undoStack'

export function useUndoStack() {
  const [top, setTop] = useState<{ label: string } | null>(() => peekUndo())

  useEffect(() => {
    return subscribeUndo(() => setTop(peekUndo()))
  }, [])

  const undo = useCallback(() => {
    const action = popUndo()
    if (action) action.undo()
  }, [])

  return { canUndo: top !== null, undoLabel: top?.label ?? null, undo }
}
