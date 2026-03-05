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
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <span className="text-xs text-gray-400 font-medium shrink-0">Sources:</span>
      {sources.map((source) => {
        const isActive = active.has(source.id)
        return (
          <button
            key={source.id}
            onClick={() => onToggle(source.id)}
            className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all"
            style={
              isActive
                ? {
                    backgroundColor: source.color,
                    borderColor: source.color,
                    color: '#fff',
                  }
                : {
                    backgroundColor: 'transparent',
                    borderColor: source.color,
                    color: source.color,
                  }
            }
          >
            {source.name}
          </button>
        )
      })}
    </div>
  )
}
