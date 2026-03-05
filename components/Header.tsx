import Link from 'next/link'

interface Props {
  activeFeed: 'research' | 'music' | 'misc'
  sourcesCount?: number
}

export function Header({ activeFeed, sourcesCount }: Props) {
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
            href="/music"
            className={`px-4 py-2 font-display text-sm font-semibold tracking-tight transition-colors ${
              activeFeed === 'music'
                ? 'bg-black text-white'
                : 'bg-white text-black/40 hover:text-black'
            }`}
          >
            Music Feed
          </Link>
          <Link
            href="/misc"
            className={`px-4 py-2 font-display text-sm font-semibold tracking-tight transition-colors ${
              activeFeed === 'misc'
                ? 'bg-black text-white'
                : 'bg-white text-black/40 hover:text-black'
            }`}
          >
            Misc
          </Link>
        </div>

        {sourcesCount !== undefined && (
          <span className="text-xs text-black/30 font-light tracking-widest uppercase">
            {sourcesCount} source{sourcesCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </header>
  )
}
