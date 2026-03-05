import type { Source, FetcherResult, Post } from '../types'

interface NTSMedia {
  background_large?: string
  background_medium_large?: string
  background_medium?: string
  background_small?: string
}

interface NTSShow {
  show_alias: string
  name: string
  description?: string
  updated?: string
  location_long?: string
  media?: NTSMedia
  genres?: { id: string; value: string }[]
}

interface NTSResponse {
  results?: NTSShow[]
  metadata?: { resultset?: { count: number; offset: number; limit: number } }
}

export async function fetchNTS(source: Source, page: number): Promise<FetcherResult> {
  const limit = 20
  const offset = (page - 1) * limit

  const url = `https://www.nts.live/api/v2/shows?limit=${limit}&offset=${offset}&order=latest`

  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) throw new Error(`NTS fetch error ${res.status}`)

  const data: NTSResponse = await res.json()
  const shows = data.results ?? []

  const posts: Post[] = shows.map((show) => {
    const image =
      show.media?.background_large ??
      show.media?.background_medium_large ??
      show.media?.background_medium ??
      undefined

    const genres = show.genres?.map((g) => g.value).join(', ')
    const location = show.location_long
    const excerpt = [location, genres, show.description]
      .filter(Boolean)
      .join(' · ')
      .slice(0, 200) || undefined

    return {
      id: `nts-${show.show_alias}`,
      title: show.name,
      url: `https://www.nts.live/shows/${show.show_alias}`,
      image,
      excerpt,
      date: show.updated ?? new Date().toISOString(),
      sourceId: source.id,
      sourceName: source.name,
      sourceColor: source.color,
    }
  })

  const total = data.metadata?.resultset?.count ?? 0
  const hasMore = offset + limit < total

  return { posts, nextPage: hasMore ? page + 1 : undefined, hasMore }
}
