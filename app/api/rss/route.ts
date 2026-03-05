import * as cheerio from 'cheerio'
import { createHash } from 'crypto'
import { NextResponse } from 'next/server'
import type { Post } from '@/lib/types'

function urlId(url: string) {
  return createHash('sha1').update(url).digest('hex').slice(0, 16)
}

// WordPress REST API — tries common post type slugs
const WP_POST_TYPES = ['posts', 'stories', 'articles', 'news', 'updates', 'blog']

async function tryWordPressApi(
  baseUrl: string,
  sourceId: string,
  sourceName: string,
  sourceColor: string,
  page: number
): Promise<{ posts: Post[]; hasMore: boolean }> {
  const headers = { 'User-Agent': 'Mozilla/5.0 (compatible; feed-app/1.0)' }
  for (const type of WP_POST_TYPES) {
    try {
      const res = await fetch(
        `${baseUrl}/wp-json/wp/v2/${type}?per_page=20&page=${page}&_embed=1`,
        { headers, signal: AbortSignal.timeout(6000) }
      )
      if (!res.ok) continue
      const items = await res.json()
      if (!Array.isArray(items) || items.length === 0) continue

      const totalPages = parseInt(res.headers.get('X-WP-TotalPages') ?? '1', 10)

      const posts = items.map((item: Record<string, unknown>) => {
        const title = (item.title as Record<string, string>)?.rendered?.replace(/<[^>]+>/g, '') ?? ''
        const url = (item.link as string) ?? ''
        const date = item.date ? new Date(item.date as string).toISOString() : new Date().toISOString()
        const excerpt = (item.excerpt as Record<string, string>)?.rendered?.replace(/<[^>]+>/g, '').trim().slice(0, 200)
        const embedded = item._embedded as Record<string, unknown> | undefined
        const media = embedded?.['wp:featuredmedia']
        const image = Array.isArray(media) ? (media[0] as Record<string, string>)?.source_url : undefined

        return {
          id: `${sourceId}-${urlId(url)}`,
          title,
          url,
          date,
          excerpt: excerpt || undefined,
          image,
          sourceId,
          sourceName,
          sourceColor,
        }
      }).filter((p: Post) => p.title && p.url)

      return { posts, hasMore: page < totalPages }
    } catch { /* try next type */ }
  }
  return { posts: [], hasMore: false }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const feedUrl = searchParams.get('url')
  const sourceId = searchParams.get('sourceId') ?? 'user'
  const sourceName = searchParams.get('sourceName') ?? 'Unknown'
  const sourceColor = searchParams.get('sourceColor') ?? '#6366f1'
  const page = parseInt(searchParams.get('page') ?? '1', 10)

  if (!feedUrl) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  try {
    const baseUrl = new URL(feedUrl).origin

    // For page 2+, go straight to WordPress REST API (only WP supports REST pagination)
    if (page > 1) {
      const { posts, hasMore } = await tryWordPressApi(baseUrl, sourceId, sourceName, sourceColor, page)
      return NextResponse.json({ posts, hasMore, feedTitle: '' })
    }

    // Page 1: fetch RSS/Atom feed
    const res = await fetch(feedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; feed-app/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const xml = await res.text()
    const $ = cheerio.load(xml, { xmlMode: true })

    const isAtom = $('feed').length > 0
    const items = isAtom ? $('entry') : $('item')
    const feedTitle = $('channel > title, feed > title').first().text().trim()
    const isWordPress = xml.includes('wordpress.org')

    const posts: Post[] = []
    items.each((_, el) => {
      const $el = $(el)
      const title = $el.find('title').first().text().trim()

      let link = ''
      if (isAtom) {
        link =
          $el.find('link[rel="alternate"]').attr('href') ??
          $el.find('link').not('[rel]').attr('href') ??
          $el.find('link').first().attr('href') ??
          $el.find('id').first().text().trim()
      } else {
        link =
          $el.find('link').first().text().trim() ||
          $el.find('link').first().attr('href') ||
          ($el.find('guid').attr('isPermaLink') !== 'false' ? $el.find('guid').first().text().trim() : '') ||
          ''
      }

      const date = $el.find('pubDate, published, updated').first().text().trim()
      const excerpt = $el.find('description, summary').first().text()
        .replace(/<[^>]+>/g, '').trim().slice(0, 200) || undefined

      if (!title || !link) return

      let image: string | undefined
      const enclosureUrl = $el.find('enclosure').attr('url')
      const enclosureType = $el.find('enclosure').attr('type') ?? ''
      if (enclosureUrl && enclosureType.startsWith('image')) image = enclosureUrl
      if (!image) {
        const rawHtml = $el.find('description, content').first().html() ?? ''
        const imgMatch = rawHtml.match(/<img[^>]+src=["']([^"']+)["']/i)
        if (imgMatch) image = imgMatch[1]
      }

      posts.push({
        id: `${sourceId}-${urlId(link)}`,
        title,
        url: link,
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        excerpt: excerpt || undefined,
        image,
        sourceId,
        sourceName,
        sourceColor,
      })
    })

    // If RSS returned nothing and this looks like WordPress, try the REST API
    if (posts.length === 0 && isWordPress) {
      const { posts: wpPosts, hasMore } = await tryWordPressApi(baseUrl, sourceId, sourceName, sourceColor, 1)
      return NextResponse.json({ posts: wpPosts, feedTitle, hasMore })
    }

    // RSS returned items — WordPress sites have more pages via REST API
    return NextResponse.json({ posts, feedTitle, hasMore: isWordPress })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
