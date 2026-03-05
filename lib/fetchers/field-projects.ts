import type { Source, FetcherResult, Post } from '../types'

interface SquarespaceItem {
  id: string
  title: string
  fullUrl: string
  assetUrl?: string
  body?: string
  excerpt?: string
  addedOn?: number
  publishOn?: number
}

interface SquarespaceResponse {
  items?: SquarespaceItem[]
  collection?: { items?: SquarespaceItem[] }
  pagination?: { hasNextPage?: boolean; nextPage?: string }
}

export async function fetchFieldProjects(
  source: Source,
  page: number
): Promise<FetcherResult> {
  const baseUrl = 'https://www.fieldprojectsgallery.com/online'
  const url = page > 1
    ? `${baseUrl}?format=json&page=${page}`
    : `${baseUrl}?format=json`

  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: 3600 },
  })

  if (!res.ok) throw new Error(`Field Projects fetch error ${res.status}`)

  const data: SquarespaceResponse = await res.json()

  const items: SquarespaceItem[] = data.items ?? data.collection?.items ?? []

  const posts: Post[] = items
    .filter((item) => item.title && item.fullUrl)
    .map((item) => {
      const postUrl = item.fullUrl.startsWith('http')
        ? item.fullUrl
        : `https://www.fieldprojectsgallery.com${item.fullUrl}`

      // Strip HTML from body for excerpt
      const rawExcerpt = item.excerpt ?? item.body ?? ''
      const excerpt = rawExcerpt.replace(/<[^>]+>/g, '').trim().slice(0, 200)

      const ts = item.publishOn ?? item.addedOn
      const date = ts ? new Date(ts).toISOString() : new Date().toISOString()

      return {
        id: `${source.id}-${item.id}`,
        title: item.title,
        url: postUrl,
        image: item.assetUrl ?? undefined,
        excerpt: excerpt || undefined,
        date,
        sourceId: source.id,
        sourceName: source.name,
        sourceColor: source.color,
      }
    })

  const hasMore = data.pagination?.hasNextPage ?? false

  return { posts, nextPage: hasMore ? page + 1 : undefined, hasMore }
}
