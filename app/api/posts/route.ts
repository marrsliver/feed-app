import { NextRequest, NextResponse } from 'next/server'
import { researchSources, musicSources } from '@/lib/sources.config'

const sources = [...researchSources, ...musicSources]
import { fetchSource } from '@/lib/fetchers'
import type { Post } from '@/lib/types'

export const revalidate = 1800

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const sourcesParam = searchParams.get('sources')
  const query = searchParams.get('q')?.toLowerCase() ?? ''

  // Filter which sources to fetch
  const activeSources = sourcesParam
    ? sources.filter((s) => sourcesParam.split(',').includes(s.id))
    : sources

  if (activeSources.length === 0) {
    return NextResponse.json({ posts: [], hasMore: false })
  }

  // Fetch all active sources in parallel
  const results = await Promise.allSettled(
    activeSources.map((source) => fetchSource(source, page))
  )

  let posts: Post[] = []
  let hasMore = false

  for (const result of results) {
    if (result.status === 'fulfilled') {
      posts = posts.concat(result.value.posts)
      if (result.value.hasMore) hasMore = true
    }
  }

  // Sort by date descending
  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Apply search filter
  if (query) {
    posts = posts.filter(
      (p) =>
        p.title.toLowerCase().includes(query) ||
        p.excerpt?.toLowerCase().includes(query)
    )
  }

  return NextResponse.json({ posts, hasMore, nextPage: hasMore ? page + 1 : undefined })
}
