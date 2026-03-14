'use client'

import { useState } from 'react'
import { researchSources } from '@/lib/sources.config'
import { Feed } from '@/components/Feed'
import { Header } from '@/components/Header'

export default function Home() {
  const [sourcesCardsTick, setSourcesCardsTick] = useState(0)

  return (
    <main className="min-h-screen">
      <Header
        activeFeed="research"
        sourcesCount={researchSources.length}
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
