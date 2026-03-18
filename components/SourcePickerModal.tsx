'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { X, Search, ChevronRight, ChevronDown, Plus, Loader2 } from 'lucide-react'
import type { LibrarySource } from '@/lib/types'
import { useSourceCategories } from '@/hooks/useSourceCategories'
import { useSourceIndustries } from '@/hooks/useSourceIndustries'
import { useLibrarySources } from '@/hooks/useLibrarySources'

interface Props {
  sources: LibrarySource[]
  onSelect: (id: string) => void
  onClose: () => void
  title?: string
}

interface Group {
  industryId: string | null
  industryName: string
  categories: {
    categoryId: string | null
    categoryName: string
    sources: LibrarySource[]
  }[]
}

function buildGroups(
  sources: LibrarySource[],
  industries: { id: string; name: string }[],
  categories: { id: string; name: string }[]
): Group[] {
  const industryMap = Object.fromEntries(industries.map((i) => [i.id, i.name]))
  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]))

  const byIndustry: Record<string, LibrarySource[]> = {}
  const noIndustry: LibrarySource[] = []

  for (const s of sources) {
    if (s.industryId) {
      byIndustry[s.industryId] = byIndustry[s.industryId] ?? []
      byIndustry[s.industryId].push(s)
    } else {
      noIndustry.push(s)
    }
  }

  const groups: Group[] = []

  // Industries in order, only those with sources
  const industryOrder = industries.map((i) => i.id).filter((id) => byIndustry[id]?.length)
  for (const industryId of industryOrder) {
    const industrySources = byIndustry[industryId]
    const byCategory: Record<string, LibrarySource[]> = {}
    const noCat: LibrarySource[] = []
    for (const s of industrySources) {
      if (s.categoryId) {
        byCategory[s.categoryId] = byCategory[s.categoryId] ?? []
        byCategory[s.categoryId].push(s)
      } else {
        noCat.push(s)
      }
    }
    const cats = [
      ...Object.entries(byCategory).map(([catId, srcs]) => ({
        categoryId: catId,
        categoryName: categoryMap[catId] ?? catId,
        sources: srcs.sort((a, b) => a.name.localeCompare(b.name)),
      })),
      ...(noCat.length ? [{ categoryId: null, categoryName: '', sources: noCat.sort((a, b) => a.name.localeCompare(b.name)) }] : []),
    ].sort((a, b) => a.categoryName.localeCompare(b.categoryName))

    groups.push({ industryId, industryName: industryMap[industryId] ?? industryId, categories: cats })
  }

  if (noIndustry.length) {
    groups.push({
      industryId: null,
      industryName: 'Other',
      categories: [{ categoryId: null, categoryName: '', sources: noIndustry.sort((a, b) => a.name.localeCompare(b.name)) }],
    })
  }

  return groups
}

export function SourcePickerModal({ sources, onSelect, onClose, title = 'Add source to space' }: Props) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { categories } = useSourceCategories()
  const { industries } = useSourceIndustries()
  const { addSource } = useLibrarySources()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [addingNew, setAddingNew] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [detecting, setDetecting] = useState(false)
  const [detectError, setDetectError] = useState('')
  const newUrlRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (addingNew) newUrlRef.current?.focus() }, [addingNew])

  async function handleAddNew() {
    const url = newUrl.trim()
    if (!url) return
    setDetecting(true)
    setDetectError('')
    try {
      const res = await fetch('/api/detect-feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { setDetectError(data.error ?? 'Could not detect feed'); setDetecting(false); return }
      const id = `user-${Date.now()}`
      addSource({
        id,
        name: data.title || new URL(url).hostname.replace(/^www\./, ''),
        url,
        feedUrl: data.feedUrl ?? url,
        type: 'rss',
        inFeed: true,
        feedGroup: 'user',
      })
      onSelect(id)
      onClose()
    } catch {
      setDetectError('Network error — please try again')
    }
    setDetecting(false)
    setNewUrl('')
    setAddingNew(false)
  }

  useEffect(() => { inputRef.current?.focus() }, [])

  const isSearching = query.trim().length > 0

  const filteredFlat = useMemo(() => {
    if (!isSearching) return []
    const q = query.toLowerCase()
    return sources
      .filter((s) => s.name.toLowerCase().includes(q) || s.url.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [sources, query, isSearching])

  const groups = useMemo(() => buildGroups(sources, industries, categories), [sources, industries, categories])

  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function SourceRow({ s }: { s: LibrarySource }) {
    return (
      <button
        key={s.id}
        onClick={() => { onSelect(s.id); onClose() }}
        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-black/5 text-left transition-colors"
      >
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
        <span className="flex-1 text-sm truncate">{s.name}</span>
        <span className="text-[10px] text-black/25 truncate max-w-[100px] hidden sm:block">
          {s.url.replace(/^https?:\/\//, '')}
        </span>
      </button>
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none px-4">
        <div className="bg-white w-full max-w-sm shadow-xl border border-black/10 flex flex-col pointer-events-auto" style={{ maxHeight: '75vh' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/10 shrink-0">
            <h3 className="text-sm font-semibold">{title}</h3>
            <button onClick={onClose} className="text-black/30 hover:text-black transition-colors p-0.5">
              <X size={15} />
            </button>
          </div>
          <div className="relative border-b border-black/10 shrink-0">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/25 pointer-events-none" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sources…"
              className="w-full pl-8 pr-3 py-2.5 text-sm outline-none placeholder:text-black/25"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {isSearching ? (
              filteredFlat.length === 0 ? (
                <p className="text-center py-8 text-sm text-black/30">No sources found</p>
              ) : (
                filteredFlat.map((s) => <SourceRow key={s.id} s={s} />)
              )
            ) : groups.length === 0 ? (
              <p className="text-center py-8 text-sm text-black/30">No sources in library</p>
            ) : (
              groups.map((group) => {
                const isOpen = !collapsed.has(group.industryName)
                return (
                  <div key={group.industryName}>
                    <button
                      onClick={() => toggleCollapse(group.industryName)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-black/3 transition-colors"
                    >
                      {isOpen ? <ChevronDown size={12} className="text-black/30" /> : <ChevronRight size={12} className="text-black/30" />}
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-black/40">{group.industryName}</span>
                      <span className="text-[10px] text-black/20 ml-auto">{group.categories.reduce((n, c) => n + c.sources.length, 0)}</span>
                    </button>
                    {isOpen && group.categories.map((cat) => (
                      <div key={cat.categoryId ?? '__none__'}>
                        {cat.categoryName && (
                          <div className="px-6 py-1 text-[9px] uppercase tracking-widest text-black/25 font-medium bg-black/2">
                            {cat.categoryName}
                          </div>
                        )}
                        {cat.sources.map((s) => <SourceRow key={s.id} s={s} />)}
                      </div>
                    ))}
                  </div>
                )
              })
            )}
          </div>

          {/* Add new source footer */}
          <div className="border-t border-black/10 shrink-0">
            {addingNew ? (
              <div className="px-3 py-2.5 space-y-1.5">
                <input
                  ref={newUrlRef}
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddNew(); if (e.key === 'Escape') { setAddingNew(false); setNewUrl('') } }}
                  placeholder="https://example.com"
                  className="w-full text-xs border border-black/15 px-2.5 py-1.5 outline-none focus:border-black/40 transition-colors placeholder:text-black/25"
                />
                {detectError && <p className="text-[10px] text-red-500">{detectError}</p>}
                <div className="flex gap-2">
                  <button onClick={handleAddNew} disabled={!newUrl.trim() || detecting}
                    className="flex items-center gap-1.5 text-xs bg-black text-white px-3 py-1 hover:bg-black/80 transition-colors disabled:opacity-40">
                    {detecting && <Loader2 size={10} className="animate-spin" />}
                    {detecting ? 'Detecting…' : 'Add source'}
                  </button>
                  <button onClick={() => { setAddingNew(false); setNewUrl(''); setDetectError('') }}
                    className="text-xs text-black/40 hover:text-black px-2 py-1 transition-colors">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddingNew(true)}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-black/40 hover:text-black hover:bg-black/5 transition-colors text-left">
                <Plus size={12} />Add new source by URL
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
