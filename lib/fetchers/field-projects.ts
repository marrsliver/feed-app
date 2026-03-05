import * as cheerio from 'cheerio'
import { createHash } from 'crypto'
import type { Source, FetcherResult, Post } from '../types'

// Navigation/utility paths to exclude from exhibition list
const NAV_PATHS = new Set([
  '/exhibitions', '/gallery', '/gallery-info', '/field-magazine',
  '/field-pod-podcast', '/field-residency-chelsea', '/online',
  '/open-call', '/outdoor-sculpture-open-call', '/past', '/pop-up',
  '/solo-exhibition-residency-fellowship', '/new-folder', '/new-page',
  '/gallery-info', '/',
])

export async function fetchFieldProjects(
  source: Source,
  page: number
): Promise<FetcherResult> {
  if (page > 1) return { posts: [], hasMore: false }

  const BASE = 'https://www.fieldprojectsgallery.com'

  const res = await fetch(`${BASE}/online`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; feed-app/1.0)' },
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error(`Field Projects fetch error ${res.status}`)

  const html = await res.text()
  const $ = cheerio.load(html)

  // Collect all unique relative paths linked from /online
  const seen = new Set<string>()
  const exhibitionUrls: string[] = []

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? ''
    // Normalise to a simple path
    let path: string
    if (href.startsWith('http')) {
      try { path = new URL(href).pathname } catch { return }
    } else if (href.startsWith('/')) {
      path = href.split('?')[0].split('#')[0]
    } else {
      return
    }
    if (path === '/' || NAV_PATHS.has(path) || seen.has(path)) return
    seen.add(path)
    exhibitionUrls.push(`${BASE}${path}`)
  })

  // Fetch OG data for each exhibition page in parallel (cap at 30)
  const posts: Post[] = []
  await Promise.all(
    exhibitionUrls.slice(0, 30).map(async (url) => {
      try {
        const pageRes = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; feed-app/1.0)' },
          signal: AbortSignal.timeout(6000),
          next: { revalidate: 3600 },
        })
        if (!pageRes.ok) return
        const pageHtml = await pageRes.text()
        const $p = cheerio.load(pageHtml)
        const og = (prop: string) =>
          $p(`meta[property="og:${prop}"]`).attr('content') ??
          $p(`meta[name="og:${prop}"]`).attr('content')
        const title = og('title') ?? $p('title').text().trim()
        if (!title) return
        posts.push({
          id: `${source.id}-${createHash('sha1').update(url).digest('hex').slice(0, 16)}`,
          title,
          url,
          image: og('image'),
          excerpt: og('description')?.slice(0, 200),
          date: new Date().toISOString(),
          sourceId: source.id,
          sourceName: source.name,
          sourceColor: source.color,
        })
      } catch { /* skip failed pages */ }
    })
  )

  return { posts, hasMore: false }
}
