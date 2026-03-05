import { researchSources } from '@/lib/sources.config'
import { Feed } from '@/components/Feed'
import { Header } from '@/components/Header'

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header activeFeed="research" sourcesCount={researchSources.length} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Feed sources={researchSources} feedId="research" />
      </div>
    </main>
  )
}
