'use client'

import { useState } from 'react'
import { X, Rss, BookOpen, ExternalLink, MessageSquare } from 'lucide-react'
import Masonry from 'react-masonry-css'
import type { Source, UserSource } from '@/lib/types'
import { useComments } from '@/hooks/useComments'
import { SourcePanel } from './SourcePanel'

interface Props {
  staticSources: Source[]
  userSources: UserSource[]
  onClose: () => void
}

const BREAKPOINTS = {
  default: 4,
  1280: 3,
  1024: 3,
  768: 2,
  640: 1,
}

type SourceCard =
  | { kind: 'static'; id: string; name: string; url: string; color: string }
  | { kind: 'user'; id: string; name: string; url: string; color: string; inFeed: boolean; feedUrl: string }

export function SourcesCardsView({ staticSources, userSources, onClose }: Props) {
  const [selected, setSelected] = useState<SourceCard | null>(null)
  const { getComments } = useComments()

  const allCards: SourceCard[] = [
    ...staticSources.map((s): SourceCard => ({ kind: 'static', id: s.id, name: s.name, url: s.url, color: s.color })),
    ...userSources.map((s): SourceCard => ({ kind: 'user', id: s.id, name: s.name, url: s.url, color: s.color, inFeed: s.inFeed, feedUrl: s.feedUrl })),
  ].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-black/10 shrink-0">
        <h1 className="font-display text-base font-semibold text-black tracking-tight">
          Sources Library
        </h1>
        <button
          onClick={onClose}
          className="p-1 hover:bg-black/5 transition-colors text-black/30 hover:text-black"
        >
          <X size={18} />
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
        <Masonry
          breakpointCols={BREAKPOINTS}
          className="flex -ml-4 w-auto"
          columnClassName="pl-4 bg-clip-padding"
        >
          {allCards.map((s) => {
            const noteCount = getComments(s.id).length
            return (
            <div key={s.id} className="break-inside-avoid mb-4">
              <div
                className="bg-white overflow-hidden transition-all duration-300 cursor-pointer"
                style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.07)' }}
                onClick={() => setSelected(s)}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 24px rgba(0,0,0,0.1)'
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 1px rgba(0,0,0,0.07)'
                }}
              >
                {/* Color bar */}
                <div className="h-1.5 w-full" style={{ backgroundColor: s.color }} />

                <div className="p-4 space-y-3">
                  {/* Name */}
                  <h2 className="font-display text-sm font-semibold text-black leading-snug">
                    {s.name}
                  </h2>

                  {/* URL */}
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-[10px] text-black/35 hover:text-black transition-colors truncate"
                  >
                    <ExternalLink size={9} className="shrink-0" />
                    {s.url.replace(/^https?:\/\/(www\.)?/, '')}
                  </a>

                  {/* Tags + note count */}
                  <div className="flex items-center justify-between pt-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-black/30 border border-black/10 px-1.5 py-0.5">
                        {s.kind === 'static' ? 'Built-in' : 'User added'}
                      </span>
                      {s.kind === 'user' && (
                        <span className={`flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] px-1.5 py-0.5 border ${
                          s.inFeed
                            ? 'border-black/20 text-black/50'
                            : 'border-black/10 text-black/25'
                        }`}>
                          {s.inFeed ? <Rss size={8} /> : <BookOpen size={8} />}
                          {s.inFeed ? 'In feed' : 'List only'}
                        </span>
                      )}
                      {s.kind === 'static' && (
                        <span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] px-1.5 py-0.5 border border-black/20 text-black/50">
                          <Rss size={8} />
                          In feed
                        </span>
                      )}
                    </div>
                    {noteCount > 0 && (
                      <span className="flex items-center gap-1 text-[9px] text-black/30">
                        <MessageSquare size={9} />
                        {noteCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
          })}
        </Masonry>
      </div>

      {selected && (
        <SourcePanel source={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
