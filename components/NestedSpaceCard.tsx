'use client'

import { useState } from 'react'
import { Layers, X } from 'lucide-react'
import type { SpaceItem, Space } from '@/lib/types'

interface Props {
  item: SpaceItem
  space?: Space
  onNavigate: () => void
  onRemove: () => void
  onDelete?: () => void
}

export function NestedSpaceCard({ item, space, onNavigate, onRemove, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false)
  const name = space?.name ?? 'Unknown space'
  const count = space?.items.length ?? 0

  return (
    <div
      className="bg-white border border-black/10 overflow-hidden group relative cursor-pointer transition-all hover:border-black/30"
      style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.05)' }}
      onClick={onNavigate}
    >
      <div className="h-1 w-full bg-black/10" />

      <div className="p-3 flex items-center gap-2">
        <Layers size={14} className="text-black/30 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-black truncate">{name}</p>
          <p className="text-[10px] text-black/30">{count} {count === 1 ? 'item' : 'items'}</p>
        </div>

        {confirming ? (
          <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { onRemove(); setConfirming(false) }} className="text-[10px] text-black/50 hover:text-black font-medium px-1 transition-colors">Remove</button>
            {onDelete && <button onClick={() => { onDelete(); setConfirming(false) }} className="text-[10px] text-red-500 hover:text-red-700 font-medium px-1 transition-colors">Delete</button>}
            <button onClick={() => setConfirming(false)} className="text-[10px] text-black/30 hover:text-black/60 px-0.5 transition-colors leading-none">×</button>
          </div>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); setConfirming(true) }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-black/25 hover:text-black p-0.5 shrink-0"
            aria-label="Remove nested space"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  )
}
