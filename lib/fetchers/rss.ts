import Parser from 'rss-parser'
import type { Post, Source, FetcherResult } from '../types'

const parser = new Parser({
  customFields: {
    item: ['media:content', 'media:thumbnail', 'enclosure'],
  },
})

function extractImageFromItem(item: Parser.Item & Record<string, unknown>): string | undefined {
  // Try media:content
  const mediaContent = item['media:content'] as { $?: { url?: string } } | undefined
  if (mediaContent?.$?.url) return mediaContent.$.url

  // Try media:thumbnail
  const mediaThumbnail = item['media:thumbnail'] as { $?: { url?: string } } | undefined
  if (mediaThumbnail?.$?.url) return mediaThumbnail.$.url

  // Try enclosure
  if (item.enclosure?.url && item.enclosure.type?.startsWith('image/')) {
    return item.enclosure.url
  }

  // Try extracting from content
  const content = item['content:encoded'] as string | undefined || item.content
  if (content) {
    const match = content.match(/<img[^>]+src=["']([^"']+)["']/i)
    if (match) return match[1]
  }

  return undefined
}

export async function fetchRSS(
  source: Source,
  page: number
): Promise<FetcherResult> {
  const feedUrl = source.feedUrl ?? `${source.url}/feed`
  const feed = await parser.parseURL(feedUrl)

  const pageSize = 20
  const start = (page - 1) * pageSize
  const items = feed.items.slice(start, start + pageSize)
  const hasMore = feed.items.length > start + pageSize

  const posts: Post[] = items.map((item, i) => ({
    id: `${source.id}-rss-${start + i}`,
    title: item.title ?? 'Untitled',
    url: item.link ?? source.url,
    image: extractImageFromItem(item as unknown as Parser.Item & Record<string, unknown>),
    excerpt: item.contentSnippet?.slice(0, 200),
    date: item.pubDate ?? item.isoDate ?? new Date().toISOString(),
    sourceId: source.id,
    sourceName: source.name,
    sourceColor: source.color,
  }))

  return { posts, nextPage: hasMore ? page + 1 : undefined, hasMore }
}
