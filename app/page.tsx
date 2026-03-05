import { sources } from '@/lib/sources.config'
import { Feed } from '@/components/Feed'

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <span className="text-white text-sm font-bold">R</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-none">Research Feed</h1>
            <p className="text-xs text-gray-400 mt-0.5">Aggregated from {sources.length} source{sources.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </header>

      {/* Feed */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Feed sources={sources} />
      </div>
    </main>
  )
}
