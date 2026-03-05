import { Feed } from '@/components/Feed'
import { Header } from '@/components/Header'

export default function MiscFeed() {
  return (
    <main className="min-h-screen">
      <Header activeFeed="misc" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Feed sources={[]} feedId="misc" />
      </div>
    </main>
  )
}
