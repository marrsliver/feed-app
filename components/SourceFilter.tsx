'use client'

import type { Source } from '@/lib/types'

interface Props {
  sources: Source[]
  active: Set<string>
  onToggle: (id: string) => void
  onReset: () => void
}

export function SourceFilter({ sources, active, onToggle, onReset }: Props) {
  if (sources.length === 0) return null

  const allActive = sources.every((s) => active.has(s.id))

  return (
    <div className="relative">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={onReset}
          className={`shrink-0 text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 border transition-all duration-200 ${
            allActive
              ? 'bg-black border-black text-white'
              : 'bg-transparent border-black/15 text-black/40 hover:border-black/30 hover:text-black'
          }`}
        >
          All
        </button>
        {sources.map((source) => {
          const isActive = active.has(source.id)
          return (
            <button
              key={source.id}
              onClick={() => onToggle(source.id)}
              className="shrink-0 text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 border transition-all duration-200"
              style={
                isActive && !allActive
                  ? { backgroundColor: source.color, borderColor: source.color, color: '#fff' }
                  : { backgroundColor: 'transparent', borderColor: 'rgba(0,0,0,0.15)', color: 'rgba(0,0,0,0.4)' }
              }
            >
              {source.name}
            </button>
          )
        })}
      </div>
      {/* Right fade — hints at overflow */}
      <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-white to-transparent" />
    </div>
  )
}
