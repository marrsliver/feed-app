'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { LibrarySource, SourceCategory } from '@/lib/types'

interface Props {
  tag: string
  sources: LibrarySource[]
  categories: SourceCategory[]
  onConfirm: (tag: string, newCategoryId: string, affectedSourceIds: string[]) => void
  onClose: () => void
  onCreateCategory: (name: string) => string
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function TagPromotionModal({ tag, sources, categories, onConfirm, onClose, onCreateCategory }: Props) {
  const affectedSources = sources.filter((s) => s.tags.includes(tag))
  const [categoryName, setCategoryName] = useState(tag)
  const [selectedExisting, setSelectedExisting] = useState<string>('')
  const [mode, setMode] = useState<'new' | 'existing'>('new')

  function handleConfirm() {
    let categoryId: string
    if (mode === 'existing' && selectedExisting) {
      categoryId = selectedExisting
    } else {
      categoryId = onCreateCategory(categoryName.trim() || tag)
      // Also call the API to create the category
      fetch('/api/db/source-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: slugify(categoryName.trim() || tag), name: categoryName.trim() || tag }),
      }).catch(() => {})
      categoryId = slugify(categoryName.trim() || tag)
    }
    onConfirm(tag, categoryId, affectedSources.map((s) => s.id))
  }

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/30 backdrop-blur-[1px] animate-fade-in" onClick={onClose} />

      <div className="fixed inset-0 z-[90] flex items-center justify-center p-6 pointer-events-none">
        <div className="bg-white w-full max-w-sm pointer-events-auto shadow-xl animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-black/10">
            <h2 className="text-sm font-semibold text-black">Promote tag to category</h2>
            <button onClick={onClose} className="p-1 hover:bg-black/5 transition-colors text-black/30 hover:text-black">
              <X size={16} />
            </button>
          </div>

          <div className="px-5 py-5 space-y-5">
            {/* Tag being promoted */}
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-black/40 mb-1">Tag</p>
              <span className="inline-block text-xs font-medium text-black/60 border border-black/15 px-2 py-0.5">
                {tag}
              </span>
            </div>

            {/* Affected sources */}
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-black/40 mb-2">
                Affects {affectedSources.length} source{affectedSources.length !== 1 ? 's' : ''}
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {affectedSources.map((s) => {
                  const currentCat = categories.find((c) => c.id === s.categoryId)
                  return (
                    <div key={s.id} className="flex items-center justify-between text-xs text-black/60">
                      <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        {s.name}
                      </span>
                      {currentCat && (
                        <span className="text-[9px] text-black/30 line-through">{currentCat.name}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Mode toggle */}
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-black/40 mb-2">Category</p>
              <div className="flex gap-1 mb-3">
                <button
                  onClick={() => setMode('new')}
                  className={`flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-widest border transition-colors ${
                    mode === 'new' ? 'bg-black text-white border-black' : 'border-black/15 text-black/40 hover:border-black/30'
                  }`}
                >
                  New
                </button>
                <button
                  onClick={() => setMode('existing')}
                  className={`flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-widest border transition-colors ${
                    mode === 'existing' ? 'bg-black text-white border-black' : 'border-black/15 text-black/40 hover:border-black/30'
                  }`}
                >
                  Existing
                </button>
              </div>

              {mode === 'new' ? (
                <input
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Category name…"
                  className="w-full text-xs border border-black/15 px-3 py-2 outline-none focus:border-black/40 transition-colors placeholder:text-black/25"
                />
              ) : (
                <select
                  value={selectedExisting}
                  onChange={(e) => setSelectedExisting(e.target.value)}
                  className="w-full text-xs border border-black/15 px-2 py-2 outline-none focus:border-black/40 transition-colors bg-white"
                >
                  <option value="">— Select a category —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>

            <p className="text-[10px] text-black/40">
              The tag will be removed from all affected sources and replaced with this category.
            </p>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                disabled={mode === 'existing' ? !selectedExisting : !categoryName.trim()}
                className="flex-1 py-2 text-xs font-medium bg-black text-white hover:bg-black/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Promote
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs border border-black/15 text-black/50 hover:border-black/30 hover:text-black transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
