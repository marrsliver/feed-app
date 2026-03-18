'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Search, ChevronDown, ChevronRight } from 'lucide-react'

interface SourceItem {
  id: string
  name: string
  color: string
  categoryId?: string
  industryId?: string
}

interface GroupItem {
  id: string
  name: string
}

interface Props {
  sources: SourceItem[]
  activeSources: Set<string>
  categories?: GroupItem[]
  industries?: GroupItem[]
  onConfirm: (selected: Set<string>) => void
  onClose: () => void
}

type CheckState = 'all' | 'some' | 'none'

function groupCheckState(ids: string[], selected: Set<string>): CheckState {
  if (ids.length === 0) return 'none'
  const count = ids.filter(id => selected.has(id)).length
  if (count === ids.length) return 'all'
  if (count > 0) return 'some'
  return 'none'
}

function GroupCheckbox({ state, onClick }: { state: CheckState; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-4 h-4 border shrink-0 flex items-center justify-center transition-colors"
      style={{
        backgroundColor: state === 'all' ? '#000' : 'transparent',
        borderColor: state === 'none' ? 'rgba(0,0,0,0.25)' : '#000',
      }}
    >
      {state === 'all' && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
      {state === 'some' && (
        <div className="w-2 h-0.5 bg-black" />
      )}
    </button>
  )
}

export function SelectSourcesModal({ sources, activeSources, categories = [], industries = [], onConfirm, onClose }: Props) {
  const allSourceIds = useMemo(() => sources.map(s => s.id), [sources])

  // Start empty when all are active — groups then ADD (never confusingly deselect)
  // Start with current selection when a partial filter is already applied
  const [selected, setSelected] = useState<Set<string>>(() => {
    const allActive = sources.every(s => activeSources.has(s.id))
    return allActive ? new Set<string>() : new Set(activeSources)
  })

  const [search, setSearch] = useState('')
  const [expandedIndustries, setExpandedIndustries] = useState<Set<string>>(new Set())
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Build hierarchy: industry → category → sources
  const hierarchy = useMemo(() => {
    type IndEntry = { id: string; name: string; categories: Map<string, { id: string; name: string; sources: SourceItem[] }>; uncategorized: SourceItem[] }
    const industryMap = new Map<string, IndEntry>()

    for (const ind of industries) {
      industryMap.set(ind.id, { id: ind.id, name: ind.name, categories: new Map(), uncategorized: [] })
    }
    industryMap.set('__none__', { id: '__none__', name: 'Uncategorized', categories: new Map(), uncategorized: [] })

    for (const source of sources) {
      const indId = source.industryId ?? '__none__'
      if (!industryMap.has(indId)) {
        industryMap.set(indId, { id: indId, name: 'Uncategorized', categories: new Map(), uncategorized: [] })
      }
      const ind = industryMap.get(indId)!
      const catId = source.categoryId
      if (catId) {
        if (!ind.categories.has(catId)) {
          const cat = categories.find(c => c.id === catId)
          ind.categories.set(catId, { id: catId, name: cat?.name ?? catId, sources: [] })
        }
        ind.categories.get(catId)!.sources.push(source)
      } else {
        ind.uncategorized.push(source)
      }
    }

    // Remove empty buckets; put __none__ last
    const named: [string, IndEntry][] = []
    const none: [string, IndEntry][] = []
    for (const [id, ind] of industryMap) {
      const total = [...ind.categories.values()].reduce((n, c) => n + c.sources.length, 0) + ind.uncategorized.length
      if (total === 0) continue
      if (id === '__none__') none.push([id, ind])
      else named.push([id, ind])
    }
    return [...named, ...none] as [string, IndEntry][]
  }, [sources, industries, categories])

  const filteredSources = search.trim()
    ? sources.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    : null

  // Groups ONLY add sources — never remove on group click.
  // Individual source checkboxes toggle freely.
  function addGroup(ids: string[]) {
    setSelected(prev => {
      const next = new Set(prev)
      ids.forEach(id => next.add(id))
      return next
    })
  }

  function toggleSource(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleIndustry(id: string) {
    setExpandedIndustries(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function toggleCategory(id: string) {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // "No filter" means selected is empty → show all
  const isNoFilter = selected.size === 0
  // For display: when no filter, treat everything as "all"
  const effectiveSelected = isNoFilter ? new Set(allSourceIds) : selected
  const allState = groupCheckState(allSourceIds, effectiveSelected)

  function handleConfirm() {
    onConfirm(isNoFilter ? new Set(allSourceIds) : selected)
    onClose()
  }

  const selectedCount = isNoFilter ? allSourceIds.length : selected.size

  return (
    <>
      {/* Backdrop + flex centering (avoids transform conflicts with animate-scale-in) */}
      <div
        className="fixed inset-0 z-[80] bg-black/30 backdrop-blur-[1px] animate-fade-in flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-white w-full max-w-md flex flex-col shadow-xl animate-scale-in"
          style={{ maxHeight: '80vh' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/10 shrink-0">
            <h2 className="text-sm font-semibold text-black">Filter Sources</h2>
            <button onClick={onClose} className="p-1 hover:bg-black/5 transition-colors text-black/30 hover:text-black">
              <X size={16} />
            </button>
          </div>

          {/* Search */}
          <div className="px-4 py-2 border-b border-black/10 shrink-0">
            <div className="flex items-center gap-2 border border-black/15 px-2.5 py-1.5">
              <Search size={12} className="text-black/30 shrink-0" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search sources…"
                className="flex-1 text-xs outline-none placeholder:text-black/25"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {filteredSources ? (
              /* Flat search results */
              <>
                <div className="px-4 py-2 text-[10px] text-black/30 uppercase tracking-widest border-b border-black/5">
                  {filteredSources.length} result{filteredSources.length !== 1 ? 's' : ''}
                </div>
                {filteredSources.map(s => (
                  <label key={s.id} className="flex items-center gap-3 px-4 py-2 hover:bg-black/3 cursor-pointer">
                    <input type="checkbox" checked={effectiveSelected.has(s.id)} onChange={() => toggleSource(s.id)} className="shrink-0" />
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-sm text-black/70 flex-1">{s.name}</span>
                  </label>
                ))}
                {filteredSources.length === 0 && (
                  <p className="text-center py-8 text-black/25 text-xs">No sources match.</p>
                )}
              </>
            ) : (
              /* Hierarchical view */
              <>
                {/* All sources row */}
                <div className="flex items-center gap-3 px-4 py-2.5 border-b border-black/8 hover:bg-black/3">
                  <GroupCheckbox
                    state={allState}
                    onClick={() => {
                      // "All" row always resets to no-filter (show all)
                      setSelected(new Set())
                    }}
                  />
                  <span className="text-xs font-semibold text-black/70 flex-1">All sources</span>
                  <span className="text-[10px] text-black/30">{selectedCount} / {allSourceIds.length}</span>
                </div>

                {hierarchy.map(([indId, ind]) => {
                  const allIndSources = [
                    ...[...ind.categories.values()].flatMap(c => c.sources),
                    ...ind.uncategorized,
                  ].map(s => s.id)
                  const indState = groupCheckState(allIndSources, effectiveSelected)
                  const isExpanded = expandedIndustries.has(indId)
                  const isNone = indId === '__none__'

                  return (
                    <div key={indId} className="border-b border-black/5">
                      {/* Industry row */}
                      <div className="flex items-center gap-2 px-4 py-2 hover:bg-black/3">
                        {/* Clicking industry group checkbox ADDS all its sources */}
                        <GroupCheckbox
                          state={indState}
                          onClick={() => addGroup(allIndSources)}
                        />
                        <button
                          onClick={() => toggleIndustry(indId)}
                          className="flex items-center gap-1.5 flex-1 text-left"
                        >
                          {isExpanded
                            ? <ChevronDown size={12} className="text-black/30 shrink-0" />
                            : <ChevronRight size={12} className="text-black/30 shrink-0" />}
                          <span className={`text-xs font-semibold ${isNone ? 'text-black/35 italic' : 'text-black/70'}`}>
                            {ind.name}
                          </span>
                          <span className="text-[10px] text-black/25 ml-1">{allIndSources.length}</span>
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="pl-4">
                          {[...ind.categories.values()].map(cat => {
                            const catIds = cat.sources.map(s => s.id)
                            const catState = groupCheckState(catIds, effectiveSelected)
                            const catKey = `${indId}-${cat.id}`
                            const catExpanded = expandedCategories.has(catKey)

                            return (
                              <div key={cat.id}>
                                <div className="flex items-center gap-2 px-4 py-1.5 hover:bg-black/3">
                                  {/* Clicking org type group checkbox ADDS all its sources */}
                                  <GroupCheckbox
                                    state={catState}
                                    onClick={() => addGroup(catIds)}
                                  />
                                  <button
                                    onClick={() => toggleCategory(catKey)}
                                    className="flex items-center gap-1.5 flex-1 text-left"
                                  >
                                    {catExpanded
                                      ? <ChevronDown size={11} className="text-black/25 shrink-0" />
                                      : <ChevronRight size={11} className="text-black/25 shrink-0" />}
                                    <span className="text-xs text-black/55">{cat.name}</span>
                                    <span className="text-[10px] text-black/25 ml-1">{catIds.length}</span>
                                  </button>
                                </div>
                                {catExpanded && cat.sources.map(s => (
                                  <label key={s.id} className="flex items-center gap-3 pl-10 pr-4 py-1.5 hover:bg-black/3 cursor-pointer">
                                    <input type="checkbox" checked={effectiveSelected.has(s.id)} onChange={() => toggleSource(s.id)} className="shrink-0" />
                                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                                    <span className="text-xs text-black/60 flex-1">{s.name}</span>
                                  </label>
                                ))}
                              </div>
                            )
                          })}

                          {/* Uncategorized sources within this industry */}
                          {ind.uncategorized.map(s => (
                            <label key={s.id} className="flex items-center gap-3 pl-8 pr-4 py-1.5 hover:bg-black/3 cursor-pointer">
                              <input type="checkbox" checked={effectiveSelected.has(s.id)} onChange={() => toggleSource(s.id)} className="shrink-0" />
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                              <span className="text-xs text-black/60 flex-1">{s.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-black/10 shrink-0 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="text-xs text-black/40 hover:text-black transition-colors">Cancel</button>
              <button
                onClick={() => setSelected(new Set())}
                className="text-xs text-black/40 hover:text-black transition-colors"
              >
                Reset
              </button>
            </div>
            <button
              onClick={handleConfirm}
              className="px-4 py-1.5 text-xs font-medium bg-black text-white hover:bg-black/80 transition-colors"
            >
              Apply {isNoFilter ? '(all)' : `(${selected.size})`}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
