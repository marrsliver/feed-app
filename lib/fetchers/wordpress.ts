import type { Post, Source, FetcherResult } from '../types'

interface WPPost {
  id: number
  link: string
  date: string
  title: { rendered: string }
  excerpt: { rendered: string }
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url?: string
      media_details?: { sizes?: { medium_large?: { source_url: string } } }
    }>
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, '\u2019')
    .replace(/&#8216;/g, '\u2018')
    .replace(/&#8220;/g, '\u201C')
    .replace(/&#8221;/g, '\u201D')
    .replace(/&#8211;/g, '\u2013')
    .replace(/&#8212;/g, '\u2014')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim()
}

function extractImage(wpPost: WPPost): string | undefined {
  const media = wpPost._embedded?.['wp:featuredmedia']?.[0]
  if (!media) return undefined
  return (
    media.media_details?.sizes?.medium_large?.source_url ||
    media.source_url
  )
}

export async function fetchWordPress(
  source: Source,
  page: number
): Promise<FetcherResult> {
  const apiPath = source.apiPath ?? '/wp/v2/posts'
  const url = new URL(`${source.url}${apiPath}`)
  url.searchParams.set('page', String(page))
  url.searchParams.set('per_page', '20')
  url.searchParams.set('_embed', '1')

  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    next: { revalidate: 1800 },
  })

  if (!res.ok) {
    throw new Error(`WordPress API error ${res.status} for ${source.url}`)
  }

  const totalPages = Number(res.headers.get('X-WP-TotalPages') ?? 1)
  const data: WPPost[] = await res.json()

  const posts: Post[] = data.map((wp) => ({
    id: `${source.id}-${wp.id}`,
    title: stripHtml(wp.title.rendered),
    url: wp.link,
    image: extractImage(wp),
    excerpt: stripHtml(wp.excerpt.rendered).slice(0, 200),
    date: wp.date,
    sourceId: source.id,
    sourceName: source.name,
    sourceColor: source.color,
  }))

  return {
    posts,
    nextPage: page < totalPages ? page + 1 : undefined,
    hasMore: page < totalPages,
  }
}
