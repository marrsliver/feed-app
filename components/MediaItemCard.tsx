'use client'

import { useState } from 'react'
import { Image as ImageIcon, Film, Music, X } from 'lucide-react'
import type { SpaceItem } from '@/lib/types'

interface Props {
  item: SpaceItem
  onRemove: () => void
  onDelete?: () => void
}

const DEFAULT_HEIGHT = 240

export function MediaItemCard({ item, onRemove, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false)
  const url = item.content ?? ''
  const type = item.mediaType ?? 'image'
  const height = item.itemHeight ?? item.mediaHeight ?? DEFAULT_HEIGHT

  return (
    <div className="bg-white overflow-hidden w-full h-full relative group">
      {/* Remove confirm */}
      <div className="absolute bottom-2 left-2 z-10">
        {confirming ? (
          <div className="flex items-center gap-0.5 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 border border-black/10">
            <button onClick={() => { onRemove(); setConfirming(false) }} className="text-[10px] text-black/50 hover:text-black font-medium px-1 transition-colors">Remove</button>
            {onDelete && <button onClick={() => { onDelete(); setConfirming(false) }} className="text-[10px] text-red-500 hover:text-red-700 font-medium px-1 transition-colors">Delete</button>}
            <button onClick={() => setConfirming(false)} className="text-[10px] text-black/30 hover:text-black/60 px-0.5 transition-colors leading-none">×</button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-0.5 text-black/30 hover:text-black">
            <X size={12} />
          </button>
        )}
      </div>
      {type === 'image' && url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          className="w-full object-cover block"
          style={{ height }}
          draggable={false}
        />
      )}
      {type === 'video' && url && (
        <video
          src={url}
          controls
          className="w-full block"
          style={{ height }}
        />
      )}
      {type === 'audio' && (
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-black/40">
            <Music size={14} />
            <span className="text-xs truncate">{url.split('/').pop()}</span>
          </div>
          <audio src={url} controls className="w-full" />
        </div>
      )}
      {!url && (
        <div className="p-6 flex flex-col items-center justify-center text-black/20 gap-2" style={{ height }}>
          {type === 'image' && <ImageIcon size={24} />}
          {type === 'video' && <Film size={24} />}
          {type === 'audio' && <Music size={24} />}
          <span className="text-xs">Media unavailable</span>
        </div>
      )}
    </div>
  )
}
