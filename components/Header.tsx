'use client'

import Link from 'next/link'
import { usePendingWrites } from '@/hooks/usePendingWrites'

interface Props {
  activeFeed: 'research' | 'remix'
  sourcesCount?: number
}

export function Header({ activeFeed, sourcesCount }: Props) {
  const { pendingCount, retrying, retry, dismissAll } = usePendingWrites()

  return (
    <header className="border-b border-black/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-end justify-between">
        {/* Tabs */}
        <div className="flex items-stretch gap-0">
          <Link
            href="/"
            className={`px-4 py-2 font-display text-sm font-semibold tracking-tight transition-colors ${
              activeFeed === 'research'
                ? 'bg-black text-white'
                : 'bg-white text-black/40 hover:text-black'
            }`}
          >
            Research Feed
          </Link>
          <Link
            href="/remix"
            className={`px-4 py-2 font-display text-sm font-semibold tracking-tight transition-colors ${
              activeFeed === 'remix'
                ? 'bg-black text-white'
                : 'bg-white text-black/40 hover:text-black'
            }`}
          >
            Remix
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <div className="flex items-center gap-1">
              <button
                onClick={retry}
                disabled={retrying}
                title={`${pendingCount} unsaved change${pendingCount !== 1 ? 's' : ''} — click to retry`}
                className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 disabled:opacity-50 transition-colors"
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {retrying ? 'Saving…' : `${pendingCount} unsaved`}
              </button>
              <button
                onClick={dismissAll}
                title="Dismiss"
                className="text-amber-500 hover:text-amber-700 transition-colors leading-none"
              >
                ×
              </button>
            </div>
          )}
          {sourcesCount !== undefined && (
            <span className="text-xs text-black/30 font-light tracking-widest uppercase">
              {sourcesCount} source{sourcesCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </header>
  )
}
