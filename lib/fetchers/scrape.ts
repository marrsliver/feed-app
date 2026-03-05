import * as cheerio from 'cheerio'
import type { Post, Source, FetcherResult } from '../types'

export async function fetchScrape(
  source: Source,
  page: number
): Promise<FetcherResult> {
  const url = page > 1 ? `${source.url}/page/${page}` : source.url
  const res = await fetch(url, { next: { revalidate: 1800 } })

  if (!res.ok) {
    throw new Error(`Scrape error ${res.status} for ${url}`)
  }

  const html = await res.text()
  const $ = cheerio.load(html)
  const posts: Post[] = []

  // Generic article scraping — tries common patterns
  $('article, .post, .entry, [class*="post-"]').each((i, el) => {
    const $el = $(el)

    const titleEl = $el.find('h1 a, h2 a, h3 a, .post-title a, .entry-title a').first()
    const title = titleEl.text().trim()
    const href = titleEl.attr('href')
    if (!title || !href) return

    const postUrl = href.startsWith('http') ? href : `${source.url}${href}`
    const image = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src')
    const excerpt = $el.find('p, .excerpt, .summary').first().text().trim().slice(0, 200)
    const dateStr = $el.find('time, .date, .published').first().attr('datetime') ||
      $el.find('time, .date, .published').first().text().trim()

    posts.push({
      id: `${source.id}-scrape-${page}-${i}`,
      title,
      url: postUrl,
      image: image && !image.startsWith('data:') ? image : undefined,
      excerpt: excerpt || undefined,
      date: dateStr || new Date().toISOString(),
      sourceId: source.id,
      sourceName: source.name,
      sourceColor: source.color,
    })
  })

  // Check for next page link
  const hasMore = $('a[rel="next"], .next-page, .pagination .next').length > 0

  return { posts, nextPage: hasMore ? page + 1 : undefined, hasMore }
}
