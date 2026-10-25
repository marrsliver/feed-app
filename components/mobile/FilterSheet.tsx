'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { BottomSheet } from './BottomSheet'

interface FilterSource {
  id: string
  name: string
  color: string
}

interface Props {
  open: boolean
  sources: FilterSource[]
  active: Set<string>
  onToggle: (id: string) => void
  onReset: () => void
  onClose: () => void
  onLogout: () => void
}

export function FilterSheet({ open, sources, active, onToggle, onReset, onClose, onLogout }: Props) {
  const [q, setQ] = useState('')
  const allActive = sources.every((s) => active.has(s.id))
  const shown = useMemo(
    () => (q ? sources.filter((s) => s.name.toLowerCase().includes(q.toLowerCase())) : sources),
    [sources, q],
  )

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Sources in today's edition"
      footer={
        <div className="flex items-center gap-2">
          <button onClick={onLogout} className="h-12 px-4 rounded-full text-[14px] text-black/45 active:bg-black/5">
            Log out
          </button>
          <button onClick={onClose} className="h-12 flex-1 rounded-full bg-black text-white text-[15px] font-semibold active:bg-black/80">
            Done
          </button>
        </div>
      }
    >
      <div className="px-5 pb-4 space-y-4">
        <div className="relative">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/35 pointer-events-none" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${sources.length} sources`}
            className="h-11 w-full rounded-xl bg-black/5 pl-10 pr-4 text-[16px] outline-none focus:ring-2 focus:ring-black/15"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onReset}
            className={`h-10 px-4 rounded-full text-[14px] font-semibold border transition-colors ${
              allActive ? 'bg-black border-black text-white' : 'border-black/15 text-black/60'
            }`}
          >
            All sources
          </button>
          {shown.map((s) => {
            const on = active.has(s.id) && !allActive
            return (
              <button
                key={s.id}
                onClick={() => onToggle(s.id)}
                className="h-10 max-w-full flex items-center gap-2 px-3.5 rounded-full text-[14px] font-medium border transition-colors"
                style={on ? { backgroundColor: s.color, borderColor: s.color, color: '#fff' } : { borderColor: 'rgba(0,0,0,0.12)', color: 'rgba(0,0,0,0.7)' }}
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: on ? '#fff' : s.color }} />
                <span className="truncate">{s.name}</span>
              </button>
            )
          })}
        </div>
        <p className="text-[13px] text-black/40">
          Tap a source to focus on it; tap more to add them. Changing sources starts a fresh edition.
        </p>
      </div>
    </BottomSheet>
  )
}
