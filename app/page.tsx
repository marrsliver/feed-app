'use client'

import { useState } from 'react'
import { Feed } from '@/components/Feed'
import { Header } from '@/components/Header'
import { useLibrarySources } from '@/hooks/useLibrarySources'

export default function Home() {
  const [sourcesCardsTick, setSourcesCardsTick] = useState(0)
  const { sources } = useLibrarySources()

  return (
    <main className="min-h-screen">
      <Header
        activeFeed="research"
        sourcesCount={sources.length}
        onShowSources={() => setSourcesCardsTick(t => t + 1)}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Feed
          feedId="research"
          showSources
          openSourcesCards={sourcesCardsTick}
        />
      </div>
    </main>
  )
}
