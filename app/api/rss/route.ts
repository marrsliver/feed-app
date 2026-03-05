import * as cheerio from 'cheerio'
import { NextResponse } from 'next/server'
import type { Post } from '@/lib/types'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const feedUrl = searchParams.get('url')
  const sourceId = searchParams.get('sourceId') ?? 'user'
  const sourceName = searchParams.get('sourceName') ?? 'Unknown'
  const sourceColor = searchParams.get('sourceColor') ?? '#6366f1'

  if (!feedUrl) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  try {
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

    const posts: Post[] = []
    items.each((_, el) => {
      const $el = $(el)
      const title = $el.find('title').first().text().trim()

      // Link extraction: try multiple strategies
      let link = ''
      if (isAtom) {
        link =
          $el.find('link[rel="alternate"]').attr('href') ??
          $el.find('link').not('[rel]').attr('href') ??
          $el.find('link').first().attr('href') ??
          $el.find('id').first().text().trim()
      } else {
        // RSS: <link> text, then <link> href attr, then <guid isPermaLink>
        link =
          $el.find('link').first().text().trim() ||
          $el.find('link').first().attr('href') ||
          ($el.find('guid').attr('isPermaLink') !== 'false' ? $el.find('guid').first().text().trim() : '') ||
          ''
      }

      const date = $el.find('pubDate, published, updated').first().text().trim()

      // Excerpt: strip HTML from description/summary
      const excerpt = $el.find('description, summary').first().text()
        .replace(/<[^>]+>/g, '').trim().slice(0, 200) || undefined

      if (!title || !link) return

      // Image: try enclosure, then <img> inside raw HTML description content
      let image: string | undefined
      const enclosureUrl = $el.find('enclosure').attr('url')
      const enclosureType = $el.find('enclosure').attr('type') ?? ''
      if (enclosureUrl && enclosureType.startsWith('image')) {
        image = enclosureUrl
      }
      if (!image) {
        // description/content CDATA often contains raw HTML — use html() not text()
        const rawHtml = $el.find('description, content').first().html() ?? ''
        const imgMatch = rawHtml.match(/<img[^>]+src=["']([^"']+)["']/i)
        if (imgMatch) image = imgMatch[1]
      }

      posts.push({
        id: `${sourceId}-${Buffer.from(link).toString('base64').slice(0, 16)}`,
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

    return NextResponse.json({ posts, feedTitle })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
