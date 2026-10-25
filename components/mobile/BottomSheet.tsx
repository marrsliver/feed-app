'use client'

import { useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useBackToClose } from '@/hooks/useBackToClose'

interface Props {
  open: boolean
  onClose: () => void
  title?: ReactNode
  /** 'full' covers ~94% of the screen (reader); 'auto' sizes to content up to 85% */
  size?: 'full' | 'auto'
  children: ReactNode
  footer?: ReactNode
}

const DISMISS_PX = 110

export function BottomSheet({ open, onClose, title, size = 'auto', children, footer }: Props) {
  const [dragY, setDragY] = useState(0)
  const startY = useRef<number | null>(null)

  useBackToClose(open, onClose)

  if (!open) return null

  function onPointerDown(e: React.PointerEvent) {
    startY.current = e.clientY
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent) {
    if (startY.current === null) return
    setDragY(Math.max(0, e.clientY - startY.current))
  }
  function onPointerUp() {
    if (startY.current === null) return
    startY.current = null
    if (dragY > DISMISS_PX) onClose()
    setDragY(0)
  }

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/40 animate-fade-in"
        style={{ opacity: 1 - Math.min(dragY / 400, 0.6) }}
        onClick={onClose}
      />
      <div
        className={`absolute inset-x-0 bottom-0 flex flex-col bg-white rounded-t-[20px] shadow-2xl animate-sheet-up ${
          size === 'full' ? 'h-[94dvh]' : 'max-h-[85dvh]'
        }`}
        style={{
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: startY.current === null ? 'transform 0.2s ease' : 'none',
        }}
      >
        {/* Drag handle + header */}
        <div
          className="shrink-0 touch-none select-none cursor-grab"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-black/15" />
          <div className="flex items-center justify-between gap-3 px-5 pt-3 pb-2 min-h-[44px]">
            <div className="min-w-0 flex-1 font-display text-lg font-semibold tracking-tight truncate">{title}</div>
            <button
              onClick={onClose}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Close"
              className="shrink-0 -mr-2 h-11 w-11 flex items-center justify-center rounded-full text-black/50 active:bg-black/5"
            >
              <X size={22} />
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-black/5 px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
