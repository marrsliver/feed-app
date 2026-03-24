'use client'

import type { Source } from '@/lib/types'

interface AssocSource {
  id: string
  name: string
  color: string
}

interface Props {
  sources: Source[]
  active: Set<string>
  onToggle: (id: string) => void
  onReset: () => void
  onToggleIncludeAssociated?: () => void
  includeAssociated?: boolean
  associatedSources?: AssocSource[]
}

export function SourceFilter({ sources, active, onToggle, onReset, onToggleIncludeAssociated, includeAssociated, associatedSources }: Props) {
  if (sources.length === 0) return null

  const allActive = sources.every((s) => active.has(s.id))
  const hasAssociated = !!onToggleIncludeAssociated && !!associatedSources && associatedSources.length > 0

  return (
    <div className="relative flex flex-col gap-1">
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
      <div className="pointer-events-none absolute right-0 top-0 h-6 w-8 bg-gradient-to-l from-white to-transparent" />

      {/* Related sources row — appears below when a source is spotlighted */}
      {hasAssociated && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={onToggleIncludeAssociated}
            className={`shrink-0 text-[10px] flex items-center gap-1 px-2 py-0.5 border transition-colors ${
              includeAssociated
                ? 'border-black/40 bg-black text-white'
                : 'border-black/15 text-black/40 hover:text-black/60 hover:border-black/30'
            }`}
          >
            <span>{includeAssociated ? '✓' : '+'}</span>
            <span>{associatedSources!.length} related source{associatedSources!.length !== 1 ? 's' : ''}</span>
          </button>
          {includeAssociated && associatedSources!.map((s) => (
            <span
              key={s.id}
              className="shrink-0 text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 text-white"
              style={{ backgroundColor: s.color }}
            >
              {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
