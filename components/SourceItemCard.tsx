'use client'

import { useState } from 'react'
import { X, ExternalLink } from 'lucide-react'
import type { SpaceItem, LibrarySource } from '@/lib/types'

interface Props {
  item: SpaceItem
  source?: LibrarySource
  onRemove: () => void
  onOpenSource?: (source: LibrarySource) => void
}

export function SourceItemCard({ item, source, onRemove, onOpenSource }: Props) {
  const [confirming, setConfirming] = useState(false)
  const name = source?.name ?? item.refId ?? 'Unknown source'
  const url = source?.url ?? ''
  const color = source?.color ?? '#000000'
  const feedType = source?.type ?? null

  return (
    <div
      className="bg-white border border-black/10 overflow-hidden group relative"
      style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.05)' }}
    >
      <div className="h-1 w-full" style={{ backgroundColor: color }} />

      <div className="p-3">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <button
              onClick={() => source && onOpenSource?.(source)}
              className={`text-sm font-medium text-black text-left truncate block w-full ${source && onOpenSource ? 'hover:underline cursor-pointer' : 'cursor-default'}`}
            >
              {name}
            </button>
            {feedType && (
              <span className="text-[9px] uppercase tracking-widest text-black/25 font-medium">{feedType}</span>
            )}
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-0.5 text-[10px] text-black/35 hover:text-black transition-colors mt-0.5 group/link"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="truncate">{url.replace(/^https?:\/\//, '')}</span>
                <ExternalLink size={9} className="shrink-0 opacity-0 group-hover/link:opacity-100 transition-opacity" />
              </a>
            )}
          </div>

          {confirming ? (
            <div className="flex items-center gap-1 shrink-0 mt-0.5">
              <span className="text-[10px] text-black/40">Remove?</span>
              <button onClick={onRemove} className="text-[10px] text-red-500 hover:text-red-700 font-medium px-1">Yes</button>
              <button onClick={() => setConfirming(false)} className="text-[10px] text-black/40 hover:text-black px-1">No</button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-black/25 hover:text-black p-0.5 shrink-0 mt-0.5"
              aria-label="Remove source"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {source?.tags && source.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {source.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="text-[9px] bg-black/5 px-1.5 py-0.5 text-black/40 uppercase tracking-wide">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
