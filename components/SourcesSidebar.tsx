'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Plus, Trash2, Loader2, Rss, BookOpen, ExternalLink } from 'lucide-react'
import type { LibrarySource, SourceCategory } from '@/lib/types'

interface Props {
  feedId: string
  staticSources: LibrarySource[]
  allStaticSources?: LibrarySource[]
  userSources: LibrarySource[]
  categories: SourceCategory[]
  onAddSource: (source: Omit<LibrarySource, 'color' | 'addedAt' | 'isStatic' | 'tags'>) => void
  onRemoveSource: (id: string) => void
  onToggleFeed: (id: string) => void
  onOpenSource?: (id: string) => void
  onClose: () => void
  onShowCards: () => void
  elevated?: boolean
}

type DetectState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'found'; feedUrl: string; title: string; siteUrl: string }
  | { status: 'categorizing'; feedUrl: string; title: string; siteUrl: string }
  | { status: 'confirm'; feedUrl: string; title: string; siteUrl: string; suggestedCategoryId: string | null; confidence: 'high' | 'medium' | 'low' }
  | { status: 'error'; message: string }

type TabView = 'library' | 'feed' | 'list'

type DisplaySource =
  | { kind: 'static'; id: string; name: string; url: string; color: string }
  | { kind: 'user'; id: string; name: string; url: string; color: string; inFeed: boolean }

function SourceRow({
  s,
  onToggleFeed,
  onRemoveSource,
  onOpenSource,
  showKind,
}: {
  s: DisplaySource
  onToggleFeed: (id: string) => void
  onRemoveSource: (id: string) => void
  onOpenSource?: (id: string) => void
  showKind: boolean
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div
      className="flex items-center gap-2.5 py-1.5 group"
      onMouseLeave={() => setConfirmDelete(false)}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onOpenSource?.(s.id)}
            className="text-sm text-black/70 hover:text-black transition-colors truncate text-left flex-1"
          >
            {s.name}
          </button>
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
        </div>
        {showKind && (
          <span className="text-[9px] text-black/25 uppercase tracking-widest">
            {s.kind === 'static' ? 'Built-in' : 'User added'}
          </span>
        )}
      </div>
      {s.kind === 'user' && (
        <>
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

export function SourcesSidebar({ feedId, staticSources, allStaticSources, userSources, categories, onAddSource, onRemoveSource, onToggleFeed, onOpenSource, onClose, onShowCards, elevated }: Props) {
  const libraryStaticSources = allStaticSources ?? staticSources
  const [inputUrl, setInputUrl] = useState('')
  const [detect, setDetect] = useState<DetectState>({ status: 'idle' })
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [tab, setTab] = useState<TabView>('library')
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
        setDetect({ status: 'error', message: 'No RSS feed found. Try pasting the RSS URL directly.' })
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

  // Build display lists
  const allStatic: DisplaySource[] = staticSources.map((s) => ({ kind: 'static', id: s.id, name: s.name, url: s.url, color: s.color }))
  const allLibraryStatic: DisplaySource[] = libraryStaticSources.map((s) => ({ kind: 'static', id: s.id, name: s.name, url: s.url, color: s.color }))
  const allUser: DisplaySource[] = userSources.map((s) => ({ kind: 'user', id: s.id, name: s.name, url: s.url, color: s.color, inFeed: s.inFeed }))

  const byName = (a: DisplaySource, b: DisplaySource) => a.name.localeCompare(b.name)

  const feedList = [...allStatic, ...allUser.filter((s) => s.kind === 'user' && (s as { inFeed: boolean }).inFeed)].sort(byName)
  const listOnlyList = allUser.filter((s) => s.kind === 'user' && !(s as { inFeed: boolean }).inFeed).sort(byName)

  // Build grouped hierarchy for library tab (uses all static sources across feed groups)
  const allLibrary = [...allLibraryStatic, ...allUser].sort(byName)
  const allLibrarySources = [...libraryStaticSources, ...userSources]
  type GroupedCategory = { categoryId: string; categoryName: string; items: DisplaySource[] }
  const grouped: GroupedCategory[] = []
  const uncategorized: DisplaySource[] = []

  for (const s of allLibrary) {
    const src = allLibrarySources.find((r) => r.id === s.id)
    const catId = src?.categoryId
    if (catId) {
      const cat = categories.find((c) => c.id === catId)
      const catName = cat?.name ?? catId
      let group = grouped.find((g) => g.categoryId === catId)
      if (!group) {
        group = { categoryId: catId, categoryName: catName, items: [] }
        grouped.push(group)
      }
      group.items.push(s)
    } else {
      uncategorized.push(s)
    }
  }
  grouped.sort((a, b) => a.categoryName.localeCompare(b.categoryName))

  const TABS: { id: TabView; label: string }[] = [
    { id: 'library', label: 'Library' },
    { id: 'feed', label: 'In Feed' },
    { id: 'list', label: 'Library Only' },
  ]

  const isLoading = detect.status === 'loading' || detect.status === 'categorizing'

  return (
    <>
      <div className={`fixed inset-0 bg-black/20 backdrop-blur-[1px] ${elevated ? 'z-[51]' : 'z-40'}`} onClick={onClose} />

      <div className={`fixed top-0 left-0 h-full w-80 bg-white shadow-xl flex flex-col ${elevated ? 'z-[55]' : 'z-50'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-black/10">
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

        {/* Source list */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
          {tab === 'library' ? (
            allLibrary.length === 0 ? (
              <p className="text-center py-10 text-black/25 text-xs">No sources yet.</p>
            ) : (
              <div className="space-y-4">
                {grouped.map((group) => (
                  <div key={group.categoryId}>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-black/30 mb-1 pb-1 border-b border-black/8">
                      {group.categoryName}
                    </p>
                    <div className="space-y-0.5">
                      {group.items.map((s) => (
                        <SourceRow key={s.id} s={s} onToggleFeed={onToggleFeed} onRemoveSource={onRemoveSource} onOpenSource={onOpenSource} showKind={false} />
                      ))}
                    </div>
                  </div>
                ))}
                {uncategorized.length > 0 && (
                  <div>
                    {grouped.length > 0 && (
                      <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-black/20 mb-1 pb-1 border-b border-black/8">
                        Uncategorized
                      </p>
                    )}
                    <div className="space-y-0.5">
                      {uncategorized.map((s) => (
                        <SourceRow key={s.id} s={s} onToggleFeed={onToggleFeed} onRemoveSource={onRemoveSource} onOpenSource={onOpenSource} showKind={false} />
                      ))}
                    </div>
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
                    <SourceRow key={s.id} s={s} onToggleFeed={onToggleFeed} onRemoveSource={onRemoveSource} onOpenSource={onOpenSource} showKind={tab === 'feed'} />
                  ))}
                </div>
              )
            })()
          )}
        </div>

        {/* Add source */}
        <div className="px-4 py-4 border-t border-black/10 space-y-3 shrink-0">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-black/30">Add a source</p>

          {detect.status === 'confirm' ? (
            <div className="space-y-3">
              {/* Source info */}
              <div className="px-3 py-2 bg-black/5 text-sm">
                <p className="font-medium text-black truncate">{detect.title}</p>
                <p className="text-[10px] text-black/40 truncate mt-0.5">{detect.feedUrl}</p>
              </div>

              {/* Category selector */}
              <div className="space-y-1">
                <p className="text-[9px] font-semibold uppercase tracking-widest text-black/40">
                  Category
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
                <p className="text-[10px] text-black/40">Suggesting category…</p>
              )}
              {detect.status === 'error' && (
                <p className="text-[10px] text-red-500">{detect.message}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
