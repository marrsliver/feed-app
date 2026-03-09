'use client'

import { useState, useMemo } from 'react'
import { X, Rss, BookOpen, ExternalLink, MessageSquare, ChevronDown, Tag, List } from 'lucide-react'
import Masonry from 'react-masonry-css'
import type { LibrarySource, SourceCategory, SourceList } from '@/lib/types'
import { useComments } from '@/hooks/useComments'
import { SourcePanel } from './SourcePanel'
import { TagPromotionModal } from './TagPromotionModal'

interface Props {
  sources: LibrarySource[]
  categories: SourceCategory[]
  allTags: string[]
  sourceLists: SourceList[]
  onSetCategory: (id: string, categoryId: string | null) => void
  onAddTag: (id: string, tag: string) => void
  onRemoveTag: (id: string, tag: string) => void
  onToggleSourceInList: (listId: string, sourceId: string) => void
  onCreateSourceList: (name: string) => string
  onClose: () => void
}

type SortMode = 'name' | 'newest' | 'oldest'

const BREAKPOINTS = {
  default: 4,
  1280: 3,
  1024: 3,
  768: 2,
  640: 1,
}

export function SourcesCardsView({
  sources,
  categories,
  allTags,
  sourceLists,
  onSetCategory,
  onAddTag,
  onRemoveTag,
  onToggleSourceInList,
  onCreateSourceList,
  onClose,
}: Props) {
  const [selected, setSelected] = useState<LibrarySource | null>(null)
  const [promotingTag, setPromotingTag] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [filterList, setFilterList] = useState<string | null>(null)
  const [sort, setSort] = useState<SortMode>('name')
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false)
  const [listDropdownOpen, setListDropdownOpen] = useState(false)
  const { getComments } = useComments()

  // Categories that actually have sources
  const activeCategories = useMemo(() => {
    const ids = new Set(sources.map((s) => s.categoryId).filter(Boolean))
    return categories.filter((c) => ids.has(c.id))
  }, [sources, categories])

  const filteredSorted = useMemo(() => {
    let list = [...sources]
    if (filterCategory) list = list.filter((s) => s.categoryId === filterCategory)
    if (filterTag) list = list.filter((s) => s.tags.includes(filterTag))
    if (filterList) {
      const sl = sourceLists.find((l) => l.id === filterList)
      if (sl) list = list.filter((s) => sl.sourceIds.includes(s.id))
    }
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name))
    else if (sort === 'newest') list.sort((a, b) => b.addedAt - a.addedAt)
    else if (sort === 'oldest') list.sort((a, b) => a.addedAt - b.addedAt)
    return list
  }, [sources, filterCategory, filterTag, filterList, sort, sourceLists])

  function handlePromoteTag(tag: string, newCategoryId: string, affectedIds: string[]) {
    affectedIds.forEach((id) => {
      onSetCategory(id, newCategoryId)
      onRemoveTag(id, tag)
    })
    setPromotingTag(null)
  }

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

      {/* Filter / Sort toolbar */}
      <div className="px-6 py-3 border-b border-black/10 flex items-center gap-3 flex-wrap shrink-0">
        {/* Category pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterCategory(null)}
            className={`text-[9px] font-semibold uppercase tracking-[0.12em] px-2 py-1 border transition-colors ${
              !filterCategory ? 'bg-black text-white border-black' : 'border-black/15 text-black/40 hover:border-black/30 hover:text-black'
            }`}
          >
            All
          </button>
          {activeCategories.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilterCategory(filterCategory === c.id ? null : c.id)}
              className={`text-[9px] font-semibold uppercase tracking-[0.12em] px-2 py-1 border transition-colors ${
                filterCategory === c.id
                  ? 'bg-black text-white border-black'
                  : 'border-black/15 text-black/40 hover:border-black/30 hover:text-black'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Tag filter */}
          {allTags.length > 0 && (
            <div className="relative">
              <button
                onClick={() => { setTagDropdownOpen(!tagDropdownOpen); setListDropdownOpen(false) }}
                className={`flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] px-2 py-1 border transition-colors ${
                  filterTag ? 'bg-black text-white border-black' : 'border-black/15 text-black/40 hover:border-black/30 hover:text-black'
                }`}
              >
                <Tag size={9} />
                {filterTag ?? 'Tag'}
                <ChevronDown size={9} />
              </button>
              {tagDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-black/15 z-10 min-w-[140px] shadow-sm">
                  {filterTag && (
                    <button
                      onClick={() => { setFilterTag(null); setTagDropdownOpen(false) }}
                      className="block w-full text-left px-3 py-1.5 text-[10px] text-black/40 hover:bg-black/5 transition-colors border-b border-black/10"
                    >
                      Clear
                    </button>
                  )}
                  {allTags.map((t) => (
                    <button
                      key={t}
                      onClick={() => { setFilterTag(t); setTagDropdownOpen(false) }}
                      className="block w-full text-left px-3 py-1.5 text-[10px] text-black/70 hover:bg-black/5 transition-colors"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* List filter */}
          {sourceLists.length > 0 && (
            <div className="relative">
              <button
                onClick={() => { setListDropdownOpen(!listDropdownOpen); setTagDropdownOpen(false) }}
                className={`flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] px-2 py-1 border transition-colors ${
                  filterList ? 'bg-black text-white border-black' : 'border-black/15 text-black/40 hover:border-black/30 hover:text-black'
                }`}
              >
                <List size={9} />
                {filterList ? sourceLists.find((l) => l.id === filterList)?.name ?? 'List' : 'List'}
                <ChevronDown size={9} />
              </button>
              {listDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-black/15 z-10 min-w-[140px] shadow-sm">
                  {filterList && (
                    <button
                      onClick={() => { setFilterList(null); setListDropdownOpen(false) }}
                      className="block w-full text-left px-3 py-1.5 text-[10px] text-black/40 hover:bg-black/5 transition-colors border-b border-black/10"
                    >
                      Clear
                    </button>
                  )}
                  {sourceLists.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => { setFilterList(l.id); setListDropdownOpen(false) }}
                      className="block w-full text-left px-3 py-1.5 text-[10px] text-black/70 hover:bg-black/5 transition-colors"
                    >
                      {l.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sort */}
          <div className="flex items-center gap-0.5">
            {(['name', 'newest', 'oldest'] as SortMode[]).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`text-[9px] font-semibold uppercase tracking-[0.12em] px-2 py-1 border transition-colors ${
                  sort === s ? 'bg-black text-white border-black' : 'border-black/15 text-black/40 hover:border-black/30 hover:text-black'
                }`}
              >
                {s === 'name' ? 'A–Z' : s === 'newest' ? 'Newest' : 'Oldest'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div
        className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6"
        onClick={() => { setTagDropdownOpen(false); setListDropdownOpen(false) }}
      >
        <Masonry
          breakpointCols={BREAKPOINTS}
          className="flex -ml-4 w-auto"
          columnClassName="pl-4 bg-clip-padding"
        >
          {filteredSorted.map((s) => {
            const noteCount = getComments(s.id).length
            const category = categories.find((c) => c.id === s.categoryId)
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

                    {/* Category badge */}
                    {category && (
                      <span className="inline-block text-[9px] font-semibold uppercase tracking-[0.12em] text-black/50 border border-black/20 px-1.5 py-0.5">
                        {category.name}
                      </span>
                    )}

                    {/* Tags row */}
                    {s.tags.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
                        {s.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-0.5 text-[9px] text-black/40 border border-black/10 px-1.5 py-0.5"
                          >
                            {tag}
                            <button
                              onClick={() => onRemoveTag(s.id, tag)}
                              className="text-black/25 hover:text-black/60 transition-colors leading-none ml-0.5"
                              aria-label={`Remove tag ${tag}`}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Status + note count */}
                    <div className="flex items-center justify-between pt-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-black/30 border border-black/10 px-1.5 py-0.5">
                          {s.isStatic ? 'Built-in' : 'User added'}
                        </span>
                        <span className={`flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] px-1.5 py-0.5 border ${
                          s.inFeed
                            ? 'border-black/20 text-black/50'
                            : 'border-black/10 text-black/25'
                        }`}>
                          {s.inFeed ? <Rss size={8} /> : <BookOpen size={8} />}
                          {s.inFeed ? 'In feed' : 'List only'}
                        </span>
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

        {filteredSorted.length === 0 && (
          <p className="text-center py-20 text-black/25 text-sm">No sources match the current filters.</p>
        )}
      </div>

      {selected && (
        <SourcePanel
          source={selected}
          categories={categories}
          allTags={allTags}
          onSetCategory={onSetCategory}
          onAddTag={onAddTag}
          onRemoveTag={onRemoveTag}
          onPromoteTag={(tag) => { setSelected(null); setPromotingTag(tag) }}
          onClose={() => setSelected(null)}
        />
      )}

      {promotingTag && (
        <TagPromotionModal
          tag={promotingTag}
          sources={sources}
          categories={categories}
          onConfirm={handlePromoteTag}
          onClose={() => setPromotingTag(null)}
          onCreateCategory={(name) => {
            // Return a slugified id
            return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
          }}
        />
      )}
    </div>
  )
}
