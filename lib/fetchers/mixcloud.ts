import type { Source, FetcherResult, Post } from '../types'

interface MixcloudPictures {
  large?: string
  extra_large?: string
  medium?: string
  thumbnail?: string
}

interface MixcloudItem {
  key: string
  url: string
  name: string
  created_time?: string
  pictures?: MixcloudPictures
  tags?: { name: string }[]
  audio_length?: number
}

interface MixcloudResponse {
  data?: MixcloudItem[]
  paging?: { next?: string }
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export async function fetchMixcloud(source: Source, page: number): Promise<FetcherResult> {
  const limit = 20
  const offset = (page - 1) * limit

  // source.apiPath holds the Mixcloud username, e.g. "thelotradio"
  const username = source.apiPath ?? ''
  const url = `https://api.mixcloud.com/${username}/cloudcasts/?limit=${limit}&offset=${offset}`

  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) throw new Error(`Mixcloud fetch error ${res.status}`)

  const data: MixcloudResponse = await res.json()
  const items = data.data ?? []

  const posts: Post[] = items.map((item) => {
    const image =
      item.pictures?.extra_large ??
      item.pictures?.large ??
      item.pictures?.medium ??
      undefined

    const tags = item.tags?.map((t) => t.name).join(', ')
    const duration = item.audio_length ? formatDuration(item.audio_length) : undefined
    const excerpt = [duration, tags].filter(Boolean).join(' · ') || undefined

    return {
      id: `${source.id}-${item.key}`,
      title: item.name,
      url: item.url,
      image,
      excerpt,
      date: item.created_time ?? new Date().toISOString(),
      sourceId: source.id,
      sourceName: source.name,
      sourceColor: source.color,
    }
  })

  const hasMore = !!data.paging?.next

  return { posts, nextPage: hasMore ? page + 1 : undefined, hasMore }
}
