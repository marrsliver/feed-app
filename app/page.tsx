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
      {/* Phones get their own full-screen shell from <Feed> */}
      <div className="hidden md:block">
        <Header
          activeFeed="research"
          sourcesCount={sources.length}
        />
      </div>
      <div className="max-w-7xl mx-auto md:px-6 lg:px-8 md:py-6">
        <Feed
          feedId="research"
          showSources
          openSourcesCards={sourcesCardsTick}
        />
      </div>
    </main>
  )
}
