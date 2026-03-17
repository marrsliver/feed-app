'use client'

import { useState, useRef, useMemo } from 'react'
import { X, Rss, BookOpen, ExternalLink, MessageSquare, ChevronDown, ChevronRight, Tag, List, Pencil } from 'lucide-react'
import Masonry from 'react-masonry-css'
import type { LibrarySource, SourceCategory, SourceIndustry, SourceList, Post, SavedList } from '@/lib/types'
import { useComments } from '@/hooks/useComments'
import { SourcePanel } from './SourcePanel'
import { TagPromotionModal } from './TagPromotionModal'
import { TagSourcesPanel } from './TagSourcesPanel'

interface Props {
  sources: LibrarySource[]
  categories: SourceCategory[]
  industries?: SourceIndustry[]
  allTags: string[]
  sourceLists: SourceList[]
  onSetCategory: (id: string, categoryId: string | null) => void
  onSetIndustry?: (id: string, industryId: string | null) => void
  onAddTag: (id: string, tag: string) => void
  onRemoveTag: (id: string, tag: string) => void
  onToggleSourceInList: (listId: string, sourceId: string) => void
  onCreateSourceList: (name: string) => string
  onCreateCategory: (name: string) => string
  onCreateIndustry?: (name: string) => string
  onToggleFeed: (id: string) => void
  onRenameSource?: (id: string, name: string) => void
  onShowLibrary: () => void
  onClose: () => void
  allFeedPosts?: Post[]
  savedLists?: SavedList[]
  isRead?: (id: string) => boolean
}

type SortMode = 'name' | 'newest' | 'oldest'

function SourceCard({
  s,
  categories,
  noteCount,
  onSelect,
  setTagPanel,
  onRemoveTag,
  onToggleFeed,
  onRenameSource,
}: {
  s: LibrarySource
  categories: SourceCategory[]
  noteCount: number
  onSelect: () => void
  setTagPanel: (tag: string) => void
  onRemoveTag: (id: string, tag: string) => void
  onToggleFeed: (id: string) => void
  onRenameSource?: (id: string, name: string) => void
}) {
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(s.name)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const category = categories.find((c) => c.id === s.categoryId)

  function handleStartRename(e: React.MouseEvent) {
    e.stopPropagation()
    setNameValue(s.name)
    setEditingName(true)
    setTimeout(() => nameInputRef.current?.focus(), 10)
  }

  function handleSaveRename() {
    const trimmed = nameValue.trim()
    if (trimmed && trimmed !== s.name) onRenameSource?.(s.id, trimmed)
    setEditingName(false)
  }

  return (
    <div
      className="bg-white overflow-hidden transition-all duration-300 cursor-pointer group/card"
      style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.07)' }}
      onClick={onSelect}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 24px rgba(0,0,0,0.1)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 1px rgba(0,0,0,0.07)' }}
    >
      <div className="h-1.5 w-full" style={{ backgroundColor: s.color }} />
      <div className="p-4 space-y-3">
        {/* Name with inline edit */}
        <div className="flex items-start gap-1.5">
          {editingName ? (
            <input
              ref={nameInputRef}
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleSaveRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveRename()
                if (e.key === 'Escape') setEditingName(false)
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 font-display text-sm font-semibold text-black leading-snug border-b border-black/30 outline-none bg-transparent pb-0.5 min-w-0"
            />
          ) : (
            <>
              <h2 className="font-display text-sm font-semibold text-black leading-snug flex-1">{s.name}</h2>
              {onRenameSource && (
                <button
                  onClick={handleStartRename}
                  className="opacity-0 group-hover/card:opacity-100 shrink-0 p-0.5 text-black/20 hover:text-black transition-all mt-0.5"
                  aria-label="Rename source"
                >
                  <Pencil size={10} />
                </button>
              )}
            </>
          )}
        </div>
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
        {category && (
          <span className="inline-block text-[9px] font-semibold uppercase tracking-[0.12em] text-black/50 border border-black/20 px-1.5 py-0.5">
            {category.name}
          </span>
        )}
        {s.tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
            {s.tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-0.5 text-[9px] text-black/40 border border-black/10 px-1.5 py-0.5">
                <button onClick={() => setTagPanel(tag)} className="hover:text-black transition-colors leading-none" title={`See all sources tagged "${tag}"`}>
                  {tag}
                </button>
                <button onClick={() => onRemoveTag(s.id, tag)} className="text-black/25 hover:text-black/60 transition-colors leading-none ml-0.5" aria-label={`Remove tag ${tag}`}>
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-black/30 border border-black/10 px-1.5 py-0.5">
              {s.isStatic ? 'Built-in' : 'User added'}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFeed(s.id) }}
              className={`flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] px-1.5 py-0.5 border transition-colors ${
                s.inFeed
                  ? 'border-black/20 text-black/50 hover:border-black/40 hover:text-black'
                  : 'border-black/10 text-black/25 hover:border-black/20 hover:text-black/40'
              }`}
              title={s.inFeed ? 'Move to list only' : 'Add to feed'}
            >
              {s.inFeed ? <Rss size={8} /> : <BookOpen size={8} />}
              {s.inFeed ? 'In feed' : 'List only'}
            </button>
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
  )
}

function SourceCardGrid({
  sources,
  categories,
  getComments,
  setSelectedId,
  setTagPanel,
  onRemoveTag,
  onToggleFeed,
  onRenameSource,
}: {
  sources: LibrarySource[]
  categories: SourceCategory[]
  getComments: (id: string) => unknown[]
  setSelectedId: (id: string) => void
  setTagPanel: (tag: string) => void
  onRemoveTag: (id: string, tag: string) => void
  onToggleFeed: (id: string) => void
  onRenameSource?: (id: string, name: string) => void
}) {
  return (
    <Masonry
      breakpointCols={BREAKPOINTS}
      className="flex -ml-4 w-auto"
      columnClassName="pl-4 bg-clip-padding"
    >
      {sources.map((s) => (
        <div key={s.id} className="break-inside-avoid mb-4">
          <SourceCard
            s={s}
            categories={categories}
            noteCount={getComments(s.id).length}
            onSelect={() => setSelectedId(s.id)}
            setTagPanel={setTagPanel}
            onRemoveTag={onRemoveTag}
            onToggleFeed={onToggleFeed}
            onRenameSource={onRenameSource}
          />
        </div>
      ))}
    </Masonry>
  )
}

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
  industries = [],
  allTags,
  sourceLists,
  onSetCategory,
  onSetIndustry,
  onAddTag,
  onRemoveTag,
  onToggleSourceInList,
  onCreateSourceList,
  onCreateCategory,
  onCreateIndustry,
  onToggleFeed,
  onRenameSource,
  onShowLibrary,
  onClose,
  allFeedPosts,
  savedLists,
  isRead,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [expandedIndustries, setExpandedIndustries] = useState<Set<string>>(new Set())
  function toggleIndustry(id: string) {
    setExpandedIndustries(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const selected = selectedId ? sources.find(s => s.id === selectedId) ?? null : null
  const [promotingTag, setPromotingTag] = useState<string | null>(null)
  const [tagPanel, setTagPanel] = useState<string | null>(null)
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

  // Two-level grouped view: Industry → Org Type → sources
  // Active when name-sorted and no filters applied
  const groupedView = useMemo(() => {
    if (sort !== 'name' || filterCategory || filterTag || filterList) return null

    type OrgGroup = { catId: string; catName: string; sources: LibrarySource[] }
    type IndustryGroup = { indId: string; indName: string; orgGroups: OrgGroup[]; ungrouped: LibrarySource[] }

    const indMap = new Map<string, IndustryGroup>()
    const noIndustry: { catMap: Map<string, OrgGroup>; ungrouped: LibrarySource[] } = { catMap: new Map(), ungrouped: [] }

    for (const s of filteredSorted) {
      if (s.industryId) {
        if (!indMap.has(s.industryId)) {
          const ind = industries.find((i) => i.id === s.industryId)
          indMap.set(s.industryId, { indId: s.industryId, indName: ind?.name ?? s.industryId, orgGroups: [], ungrouped: [] })
        }
        const indGroup = indMap.get(s.industryId)!
        if (s.categoryId) {
          let og = indGroup.orgGroups.find((g) => g.catId === s.categoryId)
          if (!og) {
            const cat = categories.find((c) => c.id === s.categoryId)
            og = { catId: s.categoryId, catName: cat?.name ?? s.categoryId, sources: [] }
            indGroup.orgGroups.push(og)
          }
          og.sources.push(s)
        } else {
          indGroup.ungrouped.push(s)
        }
      } else {
        if (s.categoryId) {
          if (!noIndustry.catMap.has(s.categoryId)) {
            const cat = categories.find((c) => c.id === s.categoryId)
            noIndustry.catMap.set(s.categoryId, { catId: s.categoryId, catName: cat?.name ?? s.categoryId, sources: [] })
          }
          noIndustry.catMap.get(s.categoryId)!.sources.push(s)
        } else {
          noIndustry.ungrouped.push(s)
        }
      }
    }

    const industryGroups = Array.from(indMap.values())
      .sort((a, b) => a.indName.localeCompare(b.indName))
      .map((g) => ({
        ...g,
        orgGroups: g.orgGroups.sort((a, b) => a.catName.localeCompare(b.catName)),
      }))

    const otherOrgGroups = Array.from(noIndustry.catMap.values()).sort((a, b) => a.catName.localeCompare(b.catName))

    return { industryGroups, otherOrgGroups, otherUngrouped: noIndustry.ungrouped }
  }, [filteredSorted, categories, industries, sort, filterCategory, filterTag, filterList])

  function handlePromoteTag(tag: string, newCategoryId: string, affectedIds: string[]) {
    affectedIds.forEach((id) => {
      onSetCategory(id, newCategoryId)
      onRemoveTag(id, tag)
    })
    setPromotingTag(null)
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden animate-fade-in">
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
        {/* Org Type pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={onShowLibrary}
            className="text-[9px] font-semibold uppercase tracking-[0.12em] px-2 py-1 border border-black/15 text-black/40 hover:border-black/30 hover:text-black transition-colors"
          >
            Library
          </button>
          <div className="w-px h-3.5 bg-black/10 mx-0.5" />
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
        {filteredSorted.length === 0 ? (
          <p className="text-center py-20 text-black/25 text-sm">No sources match the current filters.</p>
        ) : groupedView ? (
          // Two-level grouped layout: Industry → Org Type → sources
          <div className="space-y-16">
            {groupedView.industryGroups.map((indGroup) => {
              const collapsed = !expandedIndustries.has(indGroup.indId)
              return (
                <div key={indGroup.indId}>
                  <button
                    onClick={() => toggleIndustry(indGroup.indId)}
                    className="w-full flex items-center gap-2 text-left mb-6 pb-2.5 border-b-2 border-black/20 group"
                  >
                    {collapsed
                      ? <ChevronRight size={13} className="text-black/40 shrink-0" />
                      : <ChevronDown size={13} className="text-black/40 shrink-0" />
                    }
                    <span className="text-xs font-bold uppercase tracking-[0.22em] text-black">
                      {indGroup.indName}
                    </span>
                  </button>
                  {!collapsed && (
                    <div className="pl-2 space-y-8 border-l-2 border-black/6">
                      {indGroup.orgGroups.map((og) => (
                        <div key={og.catId}>
                          <h3 className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/40 mb-4 pb-1.5 border-b border-black/10 ml-3">
                            {og.catName}
                          </h3>
                          <div className="ml-3">
                            <SourceCardGrid sources={og.sources} categories={categories} getComments={getComments} setSelectedId={setSelectedId} setTagPanel={setTagPanel} onRemoveTag={onRemoveTag} onToggleFeed={onToggleFeed} onRenameSource={onRenameSource} />
                          </div>
                        </div>
                      ))}
                      {indGroup.ungrouped.length > 0 && (
                        <div className="ml-3">
                          <SourceCardGrid sources={indGroup.ungrouped} categories={categories} getComments={getComments} setSelectedId={setSelectedId} setTagPanel={setTagPanel} onRemoveTag={onRemoveTag} onToggleFeed={onToggleFeed} onRenameSource={onRenameSource} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            {(groupedView.otherOrgGroups.length > 0 || groupedView.otherUngrouped.length > 0) && (
              <div>
                {groupedView.industryGroups.length > 0 && (() => {
                  const collapsed = !expandedIndustries.has('__other__')
                  return (
                    <>
                      <button
                        onClick={() => toggleIndustry('__other__')}
                        className="w-full flex items-center gap-2 text-left mb-6 pb-2.5 border-b-2 border-black/10 group"
                      >
                        {collapsed
                          ? <ChevronRight size={13} className="text-black/25 shrink-0" />
                          : <ChevronDown size={13} className="text-black/25 shrink-0" />
                        }
                        <span className="text-xs font-bold uppercase tracking-[0.22em] text-black/30">
                          Other
                        </span>
                      </button>
                      {!collapsed && (
                        <div className="pl-2 space-y-8 border-l-2 border-black/6">
                          {groupedView.otherOrgGroups.map((og) => (
                            <div key={og.catId}>
                              <h3 className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/40 mb-4 pb-1.5 border-b border-black/10 ml-3">
                                {og.catName}
                              </h3>
                              <div className="ml-3">
                                <SourceCardGrid sources={og.sources} categories={categories} getComments={getComments} setSelectedId={setSelectedId} setTagPanel={setTagPanel} onRemoveTag={onRemoveTag} onToggleFeed={onToggleFeed} onRenameSource={onRenameSource} />
                              </div>
                            </div>
                          ))}
                          {groupedView.otherUngrouped.length > 0 && (
                            <div className="ml-3">
                              <SourceCardGrid sources={groupedView.otherUngrouped} categories={categories} getComments={getComments} setSelectedId={setSelectedId} setTagPanel={setTagPanel} onRemoveTag={onRemoveTag} onToggleFeed={onToggleFeed} onRenameSource={onRenameSource} />
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )
                })()}
                {groupedView.industryGroups.length === 0 && (
                  <div className="pl-2 space-y-8 border-l-2 border-black/6">
                    {groupedView.otherOrgGroups.map((og) => (
                      <div key={og.catId}>
                        <h3 className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/40 mb-4 pb-1.5 border-b border-black/10 ml-3">
                          {og.catName}
                        </h3>
                        <div className="ml-3">
                          <SourceCardGrid sources={og.sources} categories={categories} getComments={getComments} setSelectedId={setSelectedId} setTagPanel={setTagPanel} onRemoveTag={onRemoveTag} onToggleFeed={onToggleFeed} onRenameSource={onRenameSource} />
                        </div>
                      </div>
                    ))}
                    {groupedView.otherUngrouped.length > 0 && (
                      <div className="ml-3">
                        <SourceCardGrid sources={groupedView.otherUngrouped} categories={categories} getComments={getComments} setSelectedId={setSelectedId} setTagPanel={setTagPanel} onRemoveTag={onRemoveTag} onToggleFeed={onToggleFeed} onRenameSource={onRenameSource} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          // Flat layout (filtered or date-sorted)
          <SourceCardGrid sources={filteredSorted} categories={categories} getComments={getComments} setSelectedId={setSelectedId} setTagPanel={setTagPanel} onRemoveTag={onRemoveTag} onToggleFeed={onToggleFeed} onRenameSource={onRenameSource} />
        )}
      </div>

      {selected && (
        <SourcePanel
          source={selected}
          categories={categories}
          industries={industries}
          allTags={allTags}
          sourceLists={sourceLists}
          onSetCategory={onSetCategory}
          onSetIndustry={onSetIndustry}
          onAddTag={onAddTag}
          onRemoveTag={onRemoveTag}
          onToggleSourceInList={onToggleSourceInList}
          onCreateSourceList={onCreateSourceList}
          onPromoteTag={(tag) => { setSelectedId(null); setPromotingTag(tag) }}
          onTagClick={(tag) => { setSelectedId(null); setTagPanel(tag) }}
          onCreateCategory={onCreateCategory}
          onCreateIndustry={onCreateIndustry}
          onRenameSource={onRenameSource}
          onClose={() => setSelectedId(null)}
          allFeedPosts={allFeedPosts}
          savedLists={savedLists}
          isRead={isRead}
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
            return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
          }}
        />
      )}

      {tagPanel && (
        <TagSourcesPanel
          tag={tagPanel}
          sources={sources}
          categories={categories}
          allTags={allTags}
          onSetCategory={onSetCategory}
          onAddTag={onAddTag}
          onRemoveTag={onRemoveTag}
          onCreateCategory={onCreateCategory}
          onClose={() => setTagPanel(null)}
        />
      )}
    </div>
  )
}
