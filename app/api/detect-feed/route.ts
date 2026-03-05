import * as cheerio from 'cheerio'
import { NextResponse } from 'next/server'

const COMMON_FEED_PATHS = ['/feed', '/rss', '/feed.xml', '/atom.xml', '/rss.xml', '/index.xml']

async function tryFeedUrl(url: string): Promise<{ feedUrl: string; title: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; feed-app/1.0)' },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    const text = await res.text()
    if (!text.includes('<rss') && !text.includes('<feed') && !text.includes('<channel')) return null
    const $ = cheerio.load(text, { xmlMode: true })
    const title = $('channel > title, feed > title').first().text().trim()
    return { feedUrl: url, title }
  } catch {
    return null
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')

  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  // 1. Try the URL itself as a feed
  const direct = await tryFeedUrl(url)
  if (direct) return NextResponse.json(direct)

  try {
    // 2. Fetch as HTML, look for <link rel="alternate"> feed tags
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; feed-app/1.0)' },
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok) {
      const html = await res.text()
      const $ = cheerio.load(html)
      const feedLink = $('link[rel="alternate"][type="application/rss+xml"], link[rel="alternate"][type="application/atom+xml"]')
        .first().attr('href')

      if (feedLink) {
        const absolute = feedLink.startsWith('http') ? feedLink : new URL(feedLink, url).toString()
        const result = await tryFeedUrl(absolute)
        if (result) return NextResponse.json(result)
      }
    }

    // 3. Try common feed paths
    const base = new URL(url).origin
    for (const path of COMMON_FEED_PATHS) {
      const result = await tryFeedUrl(base + path)
      if (result) return NextResponse.json(result)
    }
  } catch { /* ignore */ }

  return NextResponse.json({ error: 'No feed found' }, { status: 404 })
}
