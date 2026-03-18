'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Plus, Trash2, Loader2, Rss, BookOpen, ExternalLink, Pencil, ChevronDown, ChevronRight } from 'lucide-react'
import type { LibrarySource, SourceCategory, SourceIndustry } from '@/lib/types'

interface Props {
  feedId: string
  staticSources: LibrarySource[]
  allStaticSources?: LibrarySource[]
  userSources: LibrarySource[]
  categories: SourceCategory[]
  industries?: SourceIndustry[]
  onAddSource: (source: Omit<LibrarySource, 'color' | 'addedAt' | 'isStatic' | 'tags'>) => void
  onRemoveSource: (id: string) => void
  onRenameSource?: (id: string, name: string) => void
  onToggleFeed: (id: string) => void
  onOpenSource?: (id: string) => void
  onClose: () => void
  onShowCards: () => void
  elevated?: boolean
  hideBackdrop?: boolean
}

type DetectState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'found'; feedUrl: string; title: string; siteUrl: string }
  | { status: 'categorizing'; feedUrl: string; title: string; siteUrl: string }
  | { status: 'confirm'; feedUrl: string; title: string; siteUrl: string; suggestedCategoryId: string | null; confidence: 'high' | 'medium' | 'low' }
  | { status: 'no-feed'; title: string; siteUrl: string }
  | { status: 'error'; message: string }

type TabView = 'library' | 'feed' | 'list'

type DisplaySource =
  | { kind: 'static'; id: string; name: string; url: string; color: string }
  | { kind: 'user'; id: string; name: string; url: string; color: string; inFeed: boolean }

function SourceRow({
  s,
  onToggleFeed,
  onRemoveSource,
  onRenameSource,
  onOpenSource,
  showKind,
}: {
  s: DisplaySource
  onToggleFeed: (id: string) => void
  onRemoveSource: (id: string) => void
  onRenameSource?: (id: string, name: string) => void
  onOpenSource?: (id: string) => void
  showKind: boolean
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(s.name)
  const nameInputRef = useRef<HTMLInputElement>(null)

  function handleStartRename() {
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
      className="flex items-center gap-2.5 py-1.5 group"
      onMouseLeave={() => { setConfirmDelete(false) }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
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
              className="flex-1 text-sm text-black border-b border-black/30 outline-none bg-transparent py-0.5 min-w-0"
            />
          ) : (
            <button
              onClick={() => onOpenSource?.(s.id)}
              className="text-sm text-black/70 hover:text-black transition-colors truncate text-left flex-1"
            >
              {s.name}
            </button>
          )}
          {!editingName && (
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 p-0.5 text-black/15 hover:text-black/50 transition-colors opacity-0 group-hover:opacity-100"
              title="Visit source"
            >
              <ExternalLink size={10} />
            </a>
          )}
        </div>
        {showKind && (
          <span className="text-[9px] text-black/25 uppercase tracking-widest">
            {s.kind === 'static' ? 'Built-in' : 'User added'}
          </span>
        )}
      </div>
      {s.kind === 'user' && !editingName && (
        <>
          <button
            onClick={handleStartRename}
            className="opacity-0 group-hover:opacity-100 shrink-0 p-1 text-black/20 hover:text-black transition-all"
            aria-label="Rename source"
          >
            <Pencil size={10} />
          </button>
          <button
            onClick={() => onToggleFeed(s.id)}
            title={s.inFeed ? 'In feed — click to move to list only' : 'List only — click to add to feed'}
            className={`shrink-0 p-1 transition-colors ${s.inFeed ? 'text-black/40 hover:text-black' : 'text-black/15 hover:text-black/40'}`}
          >
            {s.inFeed ? <Rss size={11} /> : <BookOpen size={11} />}
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onRemoveSource(s.id)}
                className="px-1.5 py-0.5 text-[9px] font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Delete?
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="p-1 text-black/30 hover:text-black transition-colors text-xs leading-none"
                aria-label="Cancel delete"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="opacity-0 group-hover:opacity-100 shrink-0 p-1 text-black/20 hover:text-red-500 transition-all"
              aria-label="Remove source"
            >
              <Trash2 size={11} />
            </button>
          )}
        </>
      )}
    </div>
  )
}

export function SourcesSidebar({ feedId, staticSources, allStaticSources, userSources, categories, industries = [], onAddSource, onRemoveSource, onRenameSource, onToggleFeed, onOpenSource, onClose, onShowCards, elevated, hideBackdrop }: Props) {
  const libraryStaticSources = allStaticSources ?? staticSources
  const [inputUrl, setInputUrl] = useState('')
  const [detect, setDetect] = useState<DetectState>({ status: 'idle' })
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [tab, setTab] = useState<TabView>('library')
  const [expandedIndustries, setExpandedIndustries] = useState<Set<string>>(new Set())
  function toggleIndustry(id: string) {
    setExpandedIndustries(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [handleEscape])

  async function handleDetect() {
    const url = inputUrl.trim()
    if (!url) return
    setDetect({ status: 'loading' })
    try {
      const res = await fetch(`/api/detect-feed?url=${encodeURIComponent(url)}`)
      const data = await res.json()
      if (!res.ok || data.error) {
        let title = inputUrl.trim()
        try { title = new URL(inputUrl.trim()).hostname } catch { /* use raw url */ }
        setDetect({ status: 'no-feed', title, siteUrl: inputUrl.trim() })
      } else {
        const title = data.title || new URL(url).hostname
        const foundState = { feedUrl: data.feedUrl, title, siteUrl: url }
        setDetect({ status: 'categorizing', ...foundState })
        // Suggest category
        try {
          const catRes = await fetch('/api/suggest-category', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: title, url, availableCategories: categories }),
          })
          const catData = await catRes.json()
          setSelectedCategoryId(catData.categoryId ?? '')
          setDetect({
            status: 'confirm',
            ...foundState,
            suggestedCategoryId: catData.categoryId ?? null,
            confidence: catData.confidence ?? 'low',
          })
        } catch {
          setDetect({ status: 'confirm', ...foundState, suggestedCategoryId: null, confidence: 'low' })
          setSelectedCategoryId('')
        }
      }
    } catch {
      setDetect({ status: 'error', message: 'Something went wrong. Check the URL and try again.' })
    }
  }

  function handleAdd(inFeed: boolean) {
    if (detect.status !== 'confirm') return
    onAddSource({
      id: `user-${Date.now()}`,
      name: detect.title,
      url: detect.siteUrl,
      feedUrl: detect.feedUrl,
      type: 'rss',
      inFeed,
      feedGroup: feedId,
      categoryId: selectedCategoryId || undefined,
    })
    setInputUrl('')
    setDetect({ status: 'idle' })
    setSelectedCategoryId('')
  }

  function handleAddLibraryOnly() {
    if (detect.status !== 'no-feed') return
    onAddSource({
      id: `user-${Date.now()}`,
      name: detect.title,
      url: detect.siteUrl,
      feedUrl: '',
      type: 'rss',
      inFeed: false,
      feedGroup: feedId,
      categoryId: selectedCategoryId || undefined,
    })
    setInputUrl('')
    setDetect({ status: 'idle' })
    setSelectedCategoryId('')
  }

  // Build display lists
  const allStatic: DisplaySource[] = staticSources.map((s) => ({ kind: 'static', id: s.id, name: s.name, url: s.url, color: s.color }))
  const allLibraryStatic: DisplaySource[] = libraryStaticSources.map((s) => ({ kind: 'static', id: s.id, name: s.name, url: s.url, color: s.color }))
  const allUser: DisplaySource[] = userSources.map((s) => ({ kind: 'user', id: s.id, name: s.name, url: s.url, color: s.color, inFeed: s.inFeed }))

  const byName = (a: DisplaySource, b: DisplaySource) => a.name.localeCompare(b.name)

  const feedList = [...allStatic, ...allUser.filter((s) => s.kind === 'user' && (s as { inFeed: boolean }).inFeed)].sort(byName)
  const listOnlyList = allUser.filter((s) => s.kind === 'user' && !(s as { inFeed: boolean }).inFeed).sort(byName)

  // Build two-level grouped hierarchy for library tab: Industry → Org Type → sources
  const allLibrary = [...allLibraryStatic, ...allUser].sort(byName)
  const allLibrarySources = [...libraryStaticSources, ...userSources]

  type OrgGroup = { catId: string; catName: string; items: DisplaySource[] }
  type IndGroup = { indId: string; indName: string; orgGroups: OrgGroup[]; ungrouped: DisplaySource[] }

  const indMap = new Map<string, IndGroup>()
  const noIndustryOrgMap = new Map<string, OrgGroup>()
  const noIndustryUngrouped: DisplaySource[] = []

  for (const s of allLibrary) {
    const src = allLibrarySources.find((r) => r.id === s.id)
    const catId = src?.categoryId
    const indId = src?.industryId

    if (indId) {
      if (!indMap.has(indId)) {
        const ind = industries.find((i) => i.id === indId)
        indMap.set(indId, { indId, indName: ind?.name ?? indId, orgGroups: [], ungrouped: [] })
      }
      const indGroup = indMap.get(indId)!
      if (catId) {
        let og = indGroup.orgGroups.find((g) => g.catId === catId)
        if (!og) {
          const cat = categories.find((c) => c.id === catId)
          og = { catId, catName: cat?.name ?? catId, items: [] }
          indGroup.orgGroups.push(og)
        }
        og.items.push(s)
      } else {
        indGroup.ungrouped.push(s)
      }
    } else {
      if (catId) {
        if (!noIndustryOrgMap.has(catId)) {
          const cat = categories.find((c) => c.id === catId)
          noIndustryOrgMap.set(catId, { catId, catName: cat?.name ?? catId, items: [] })
        }
        noIndustryOrgMap.get(catId)!.items.push(s)
      } else {
        noIndustryUngrouped.push(s)
      }
    }
  }

  const industryGroups = Array.from(indMap.values())
    .sort((a, b) => a.indName.localeCompare(b.indName))
    .map((g) => ({ ...g, orgGroups: g.orgGroups.sort((a, b) => a.catName.localeCompare(b.catName)) }))
  const otherOrgGroups = Array.from(noIndustryOrgMap.values()).sort((a, b) => a.catName.localeCompare(b.catName))

  const TABS: { id: TabView; label: string }[] = [
    { id: 'library', label: 'Library' },
    { id: 'feed', label: 'In Feed' },
    { id: 'list', label: 'Library Only' },
  ]

  const isLoading = detect.status === 'loading' || detect.status === 'categorizing'

  return (
    <>
      {!hideBackdrop && (
        <div className={`fixed inset-0 bg-black/20 backdrop-blur-[1px] animate-fade-in ${elevated ? 'z-[51]' : 'z-40'}`} onClick={onClose} />
      )}

      <div className={`fixed top-0 left-0 h-full w-80 bg-white shadow-xl flex flex-col animate-slide-left ${elevated ? 'z-[55]' : 'z-50'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-black/10 shrink-0">
          <h2 className="text-sm font-semibold text-black">Sources</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={onShowCards}
              className="px-2 py-1 text-[9px] font-semibold uppercase tracking-widest text-black/30 hover:text-black border border-black/10 hover:border-black/30 transition-colors"
            >
              Show as cards
            </button>
            <button onClick={onClose} className="p-1 hover:bg-black/5 transition-colors text-black/30 hover:text-black">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-black/10 shrink-0">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 py-2 text-[10px] font-semibold uppercase tracking-widest transition-colors ${
                tab === id ? 'text-black border-b-2 border-black -mb-px' : 'text-black/30 hover:text-black'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Add source */}
        <div className="px-4 py-4 border-b border-black/10 space-y-3 shrink-0 max-h-[50vh] overflow-y-auto">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-black/30">Add a source</p>

          {detect.status === 'no-feed' ? (
            <div className="space-y-3">
              <div className="px-3 py-2 bg-black/5 text-sm">
                <p className="font-medium text-black truncate">{detect.title}</p>
                <p className="text-[10px] text-black/40 mt-0.5">No RSS feed found</p>
              </div>
              <p className="text-[10px] text-black/50">You can still save this site to your Library for reference — it won&apos;t appear in your feed.</p>
              <div className="space-y-1">
                <p className="text-[9px] font-semibold uppercase tracking-widest text-black/40">Org Type</p>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full text-xs border border-black/15 px-2 py-1.5 outline-none focus:border-black/40 transition-colors bg-white"
                >
                  <option value="">— None —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <button onClick={handleAddLibraryOnly} className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-black text-white hover:bg-black/80 transition-colors">
                  <BookOpen size={11} /> Add to Library Only
                </button>
                <button onClick={() => setDetect({ status: 'idle' })} className="text-xs text-black/30 hover:text-black transition-colors text-center py-1">
                  Cancel
                </button>
              </div>
            </div>
          ) : detect.status === 'confirm' ? (
            <div className="space-y-3">
              {/* Source info */}
              <div className="px-3 py-2 bg-black/5 text-sm">
                <p className="font-medium text-black truncate">{detect.title}</p>
                <p className="text-[10px] text-black/40 truncate mt-0.5">{detect.feedUrl}</p>
              </div>

              {/* Org Type selector */}
              <div className="space-y-1">
                <p className="text-[9px] font-semibold uppercase tracking-widest text-black/40">
                  Org Type
                  {detect.suggestedCategoryId && detect.confidence !== 'high' && (
                    <span className="ml-1 text-black/25 normal-case">· low confidence</span>
                  )}
                </p>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full text-xs border border-black/15 px-2 py-1.5 outline-none focus:border-black/40 transition-colors bg-white"
                >
                  <option value="">— None —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <p className="text-[10px] text-black/40">How would you like to add this?</p>
              <div className="flex flex-col gap-1.5">
                <button onClick={() => handleAdd(true)} className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-black text-white hover:bg-black/80 transition-colors">
                  <Rss size={11} /> Add to feed
                </button>
                <button onClick={() => handleAdd(false)} className="flex items-center gap-2 px-3 py-2 text-xs font-medium border border-black/20 text-black/60 hover:text-black hover:border-black/40 transition-colors">
                  <BookOpen size={11} /> Save to list only
                </button>
                <button onClick={() => setDetect({ status: 'idle' })} className="text-xs text-black/30 hover:text-black transition-colors text-center py-1">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={inputUrl}
                  onChange={(e) => { setInputUrl(e.target.value); setDetect({ status: 'idle' }) }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleDetect() }}
                  placeholder="Paste a website or RSS URL…"
                  className="flex-1 text-xs border border-black/15 px-3 py-2 outline-none focus:border-black/40 transition-colors placeholder:text-black/25"
                />
                <button
                  onClick={handleDetect}
                  disabled={!inputUrl.trim() || isLoading}
                  className="px-3 py-2 text-xs font-medium bg-black text-white hover:bg-black/80 transition-colors disabled:opacity-30"
                >
                  {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                </button>
              </div>
              {detect.status === 'categorizing' && (
                <p className="text-[10px] text-black/40">Suggesting org type…</p>
              )}
              {detect.status === 'error' && (
                <p className="text-[10px] text-red-500">{detect.message}</p>
              )}
            </div>
          )}
        </div>

        {/* Source list */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
          {tab === 'library' ? (
            allLibrary.length === 0 ? (
              <p className="text-center py-10 text-black/25 text-xs">No sources yet.</p>
            ) : (
              <div className="space-y-5">
                {industryGroups.map((indGroup) => {
                  const collapsed = !expandedIndustries.has(indGroup.indId)
                  const total = indGroup.orgGroups.reduce((n, og) => n + og.items.length, 0) + indGroup.ungrouped.length
                  return (
                    <div key={indGroup.indId}>
                      <button
                        onClick={() => toggleIndustry(indGroup.indId)}
                        className="w-full flex items-center gap-1.5 text-left mb-2 pb-1.5 border-b-2 border-black/15"
                      >
                        {collapsed
                          ? <ChevronRight size={10} className="text-black/40 shrink-0" />
                          : <ChevronDown size={10} className="text-black/40 shrink-0" />
                        }
                        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/70 flex-1">
                          {indGroup.indName}
                        </span>
                        <span className="text-[9px] font-medium text-black/25 tabular-nums">{total}</span>
                      </button>
                      <div className={`grid transition-all duration-300 ease-in-out ${collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
                        <div className="overflow-hidden">
                          <div className="pl-2 border-l-2 border-black/6 space-y-3 mt-2">
                            {indGroup.orgGroups.map((og) => (
                              <div key={og.catId}>
                                <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-black/30 mb-1 pb-1 border-b border-black/8 ml-1">
                                  {og.catName}
                                </p>
                                <div className="space-y-0.5 ml-1">
                                  {og.items.map((s) => (
                                    <SourceRow key={s.id} s={s} onToggleFeed={onToggleFeed} onRemoveSource={onRemoveSource} onRenameSource={onRenameSource} onOpenSource={onOpenSource} showKind={false} />
                                  ))}
                                </div>
                              </div>
                            ))}
                            {indGroup.ungrouped.map((s) => (
                              <SourceRow key={s.id} s={s} onToggleFeed={onToggleFeed} onRemoveSource={onRemoveSource} onRenameSource={onRenameSource} onOpenSource={onOpenSource} showKind={false} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {(otherOrgGroups.length > 0 || noIndustryUngrouped.length > 0) && (
                  <div>
                    {industryGroups.length > 0 && (() => {
                      const collapsed = !expandedIndustries.has('__other__')
                      const total = otherOrgGroups.reduce((n, og) => n + og.items.length, 0) + noIndustryUngrouped.length
                      return (
                        <>
                          <button
                            onClick={() => toggleIndustry('__other__')}
                            className="w-full flex items-center gap-1.5 text-left mb-2 pb-1.5 border-b-2 border-black/8"
                          >
                            {collapsed
                              ? <ChevronRight size={10} className="text-black/25 shrink-0" />
                              : <ChevronDown size={10} className="text-black/25 shrink-0" />
                            }
                            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/25 flex-1">
                              Other
                            </span>
                            <span className="text-[9px] font-medium text-black/20 tabular-nums">{total}</span>
                          </button>
                          <div className={`grid transition-all duration-300 ease-in-out ${collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
                            <div className="overflow-hidden">
                              <div className="pl-2 border-l-2 border-black/6 space-y-3 mt-2">
                                {otherOrgGroups.map((og) => (
                                  <div key={og.catId}>
                                    <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-black/30 mb-1 pb-1 border-b border-black/8 ml-1">
                                      {og.catName}
                                    </p>
                                    <div className="space-y-0.5 ml-1">
                                      {og.items.map((s) => (
                                        <SourceRow key={s.id} s={s} onToggleFeed={onToggleFeed} onRemoveSource={onRemoveSource} onRenameSource={onRenameSource} onOpenSource={onOpenSource} showKind={false} />
                                      ))}
                                    </div>
                                  </div>
                                ))}
                                <div className="space-y-0.5">
                                  {noIndustryUngrouped.map((s) => (
                                    <SourceRow key={s.id} s={s} onToggleFeed={onToggleFeed} onRemoveSource={onRemoveSource} onRenameSource={onRenameSource} onOpenSource={onOpenSource} showKind={false} />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      )
                    })()}
                    {industryGroups.length === 0 && (
                      <div className="space-y-3">
                        {otherOrgGroups.map((og) => (
                          <div key={og.catId}>
                            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-black/30 mb-1 pb-1 border-b border-black/8">
                              {og.catName}
                            </p>
                            <div className="space-y-0.5">
                              {og.items.map((s) => (
                                <SourceRow key={s.id} s={s} onToggleFeed={onToggleFeed} onRemoveSource={onRemoveSource} onRenameSource={onRenameSource} onOpenSource={onOpenSource} showKind={false} />
                              ))}
                            </div>
                          </div>
                        ))}
                        <div className="space-y-0.5">
                          {noIndustryUngrouped.map((s) => (
                            <SourceRow key={s.id} s={s} onToggleFeed={onToggleFeed} onRemoveSource={onRemoveSource} onRenameSource={onRenameSource} onOpenSource={onOpenSource} showKind={false} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          ) : (
            (() => {
              const displayList = tab === 'feed' ? feedList : listOnlyList
              return displayList.length === 0 ? (
                <p className="text-center py-10 text-black/25 text-xs">
                  {tab === 'feed' ? 'No sources in feed yet.' : 'No library-only sources yet.'}
                </p>
              ) : (
                <div className="space-y-0.5">
                  {displayList.map((s) => (
                    <SourceRow key={s.id} s={s} onToggleFeed={onToggleFeed} onRemoveSource={onRemoveSource} onRenameSource={onRenameSource} onOpenSource={onOpenSource} showKind={tab === 'feed'} />
                  ))}
                </div>
              )
            })()
          )}
        </div>

      </div>
    </>
  )
}
