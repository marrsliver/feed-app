import * as cheerio from 'cheerio'
import type { Source, FetcherResult, Post } from '../types'

export async function fetchFieldProjects(
  source: Source,
  page: number
): Promise<FetcherResult> {
  // Field Projects restructured their site — the /online page now has a static
  // grid of exhibitions. We scrape the page for exhibition links and OG data.
  if (page > 1) return { posts: [], hasMore: false }

  const res = await fetch('https://www.fieldprojectsgallery.com/online', {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; feed-app/1.0)' },
    next: { revalidate: 3600 },
  })

  if (!res.ok) throw new Error(`Field Projects fetch error ${res.status}`)

  const html = await res.text()
  const $ = cheerio.load(html)

  // Collect unique internal exhibition links (exclude nav/utility links)
  const seen = new Set<string>()
  const links: string[] = []
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? ''
    const absolute = href.startsWith('http') ? href : `https://www.fieldprojectsgallery.com${href}`
    if (
      absolute.includes('fieldprojectsgallery.com') &&
      !absolute.includes('instagram') &&
      !absolute.includes('patreon') &&
      absolute !== 'https://www.fieldprojectsgallery.com/online' &&
      absolute !== 'https://www.fieldprojectsgallery.com/' &&
      absolute !== 'http://www.fieldprojectsgallery.com/online' &&
      !href.startsWith('#') &&
      !seen.has(absolute)
    ) {
      seen.add(absolute)
      links.push(absolute)
    }
  })

  // Fetch OG data for each exhibition page (cap at 10)
  const posts: Post[] = []
  await Promise.all(
    links.slice(0, 10).map(async (url) => {
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
          id: `${source.id}-${Buffer.from(url).toString('base64').slice(0, 20)}`,
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
