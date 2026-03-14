'use client'

import { useState, useEffect } from 'react'
import { X, Search } from 'lucide-react'

interface SourceItem {
  id: string
  name: string
  color: string
}

interface Props {
  sources: SourceItem[]
  activeSources: Set<string>
  onConfirm: (selected: Set<string>) => void
  onClose: () => void
}

export function SelectSourcesModal({ sources, activeSources, onConfirm, onClose }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(activeSources))
  const [search, setSearch] = useState('')

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const filtered = sources.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  function toggleSource(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(filtered.map(s => s.id)))
  }

  function clearAll() {
    setSelected(new Set())
  }

  function handleConfirm() {
    onConfirm(selected.size === 0 ? new Set(sources.map(s => s.id)) : selected)
    onClose()
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every(s => selected.has(s.id))

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/30 backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[90] bg-white w-full max-w-sm flex flex-col shadow-xl" style={{ maxHeight: '80vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/10 shrink-0">
          <h2 className="text-sm font-semibold text-black">Select Sources</h2>
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

        {/* Controls */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-black/10 shrink-0">
          <button
            onClick={allFilteredSelected ? clearAll : selectAll}
            className="text-[10px] text-black/40 hover:text-black transition-colors"
          >
            {allFilteredSelected ? 'Clear all' : 'Select all'}
          </button>
          <span className="text-[10px] text-black/25">{selected.size} selected</span>
        </div>

        {/* List */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {filtered.map(s => (
            <label
              key={s.id}
              className="flex items-center gap-3 px-4 py-2 hover:bg-black/3 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(s.id)}
                onChange={() => toggleSource(s.id)}
                className="shrink-0"
              />
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-sm text-black/70 flex-1">{s.name}</span>
            </label>
          ))}
          {filtered.length === 0 && (
            <p className="text-center py-8 text-black/25 text-xs">No sources match.</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-black/10 shrink-0 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="text-xs text-black/40 hover:text-black transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-1.5 text-xs font-medium bg-black text-white hover:bg-black/80 transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </>
  )
}
