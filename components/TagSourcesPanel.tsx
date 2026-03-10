'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { LibrarySource, SourceCategory } from '@/lib/types'
import { SourcePanel } from './SourcePanel'

interface Props {
  tag: string
  sources: LibrarySource[]
  categories: SourceCategory[]
  allTags: string[]
  onSetCategory: (id: string, categoryId: string | null) => void
  onAddTag: (id: string, tag: string) => void
  onRemoveTag: (id: string, tag: string) => void
  onCreateCategory: (name: string) => string
  onClose: () => void
}

export function TagSourcesPanel({
  tag,
  sources,
  categories,
  allTags,
  onSetCategory,
  onAddTag,
  onRemoveTag,
  onCreateCategory,
  onClose,
}: Props) {
  const [selectedSource, setSelectedSource] = useState<LibrarySource | null>(null)

  const taggedSources = sources
    .filter((s) => s.tags.includes(tag))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <>
      <div className="fixed inset-0 z-[55] bg-black/20 backdrop-blur-[1px]" onClick={onClose} />

      <div className="fixed top-0 left-0 h-full w-80 z-[58] bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-4 border-b border-black/10">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-black/30">Tag</p>
            <h2 className="text-sm font-semibold text-black">{tag}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-black/5 transition-colors text-black/30 hover:text-black">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {taggedSources.length === 0 ? (
            <p className="text-center py-10 text-black/25 text-xs">No sources with this tag.</p>
          ) : (
            <div className="space-y-0.5">
              {taggedSources.map((source) => {
                const cat = categories.find((c) => c.id === source.categoryId)
                return (
                  <button
                    key={source.id}
                    onClick={() => setSelectedSource(source)}
                    className="w-full flex items-center gap-2.5 py-1.5 text-left group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: source.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-black/70 group-hover:text-black transition-colors truncate">
                        {source.name}
                      </p>
                      {cat && (
                        <p className="text-[9px] text-black/25 uppercase tracking-widest">{cat.name}</p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {selectedSource && (
        <SourcePanel
          source={selectedSource}
          categories={categories}
          allTags={allTags}
          onSetCategory={onSetCategory}
          onAddTag={onAddTag}
          onRemoveTag={onRemoveTag}
          onCreateCategory={onCreateCategory}
          onClose={() => setSelectedSource(null)}
        />
      )}
    </>
  )
}
