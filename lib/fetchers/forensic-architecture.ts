import type { Post, Source, FetcherResult } from '../types'

interface FAInvestigation {
  id: number
  title: string
  slug: string
  publication_date: string
  abstract: string
  preview_image?: {
    link?: string
    width?: number
    height?: number
  } | false
  location_title?: string
}

interface FAResponse {
  investigations: FAInvestigation[]
}

export async function fetchForensicArchitecture(
  source: Source,
  page: number
): Promise<FetcherResult> {
  const apiPath = source.apiPath ?? '/api/fa/v1/investigations'
  const res = await fetch(`${source.url}${apiPath}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 1800 },
  })

  if (!res.ok) {
    throw new Error(`FA API error ${res.status}`)
  }

  const data: FAResponse = await res.json()
  const all = data.investigations ?? []

  // Sort by publication date descending
  const sorted = [...all].sort((a, b) => {
    const da = new Date(a.publication_date.replace(/\//g, '-')).getTime()
    const db = new Date(b.publication_date.replace(/\//g, '-')).getTime()
    return db - da
  })

  const pageSize = 20
  const start = (page - 1) * pageSize
  const slice = sorted.slice(start, start + pageSize)
  const hasMore = sorted.length > start + pageSize

  const posts: Post[] = slice.map((inv) => {
    const image =
      inv.preview_image && typeof inv.preview_image === 'object'
        ? inv.preview_image.link
        : undefined

    return {
      id: `${source.id}-${inv.id}`,
      title: inv.title,
      url: `${source.url}/investigation/${inv.slug}`,
      image,
      excerpt: inv.abstract?.slice(0, 200) || inv.location_title,
      date: inv.publication_date
        ? new Date(inv.publication_date.replace(/\//g, '-')).toISOString()
        : new Date().toISOString(),
      sourceId: source.id,
      sourceName: source.name,
      sourceColor: source.color,
    }
  })

  return { posts, nextPage: hasMore ? page + 1 : undefined, hasMore }
}
