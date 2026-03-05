import { sources } from '@/lib/sources.config'
import { Feed } from '@/components/Feed'

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-black/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-end justify-between">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-black leading-none">
            Research Feed
          </h1>
          <span className="text-xs text-black/30 font-light tracking-widest uppercase">
            {sources.length} sources
          </span>
        </div>
      </header>

      {/* Feed */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Feed sources={sources} />
      </div>
    </main>
  )
}
