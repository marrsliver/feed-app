import { musicSources } from '@/lib/sources.config'
import { Feed } from '@/components/Feed'
import { Header } from '@/components/Header'

export default function MusicFeed() {
  return (
    <main className="min-h-screen">
      <Header activeFeed="music" sourcesCount={musicSources.length} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Feed sources={musicSources} />
      </div>
    </main>
  )
}
