'use client'

import type { Source } from '@/lib/types'

interface Props {
  sources: Source[]
  active: Set<string>
  onToggle: (id: string) => void
}

export function SourceFilter({ sources, active, onToggle }: Props) {
  if (sources.length === 0) return null

  return (
    <div className="relative">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {sources.map((source) => {
        const isActive = active.has(source.id)
        return (
          <button
            key={source.id}
            onClick={() => onToggle(source.id)}
            className="shrink-0 text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 border transition-all duration-200"
            style={
              isActive
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
