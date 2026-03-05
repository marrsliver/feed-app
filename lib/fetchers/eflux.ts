import type { Post, Source, FetcherResult } from '../types'

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

interface EfluxNote {
  id: number
  url: string
  date: string
  title: string
  authors: string
  previewtext: string | null
  previewimage: {
    src: string
    width?: number
    height?: number
  } | null
}

function unescapeRSC(raw: string): string {
  try {
    return JSON.parse(`"${raw}"`)
  } catch {
    return raw
  }
}

function extractNotes(html: string): EfluxNote[] {
  // Collect all __next_f RSC push payloads and concatenate
  const payloadRe = /self\.__next_f\.push\(\[1,"([\s\S]+?)"\]\)/g
  let full = ''
  for (const m of html.matchAll(payloadRe)) {
    full += unescapeRSC(m[1])
  }

  // Find the JSON array of note objects embedded in the RSC tree
  // Pattern: {"id":NNNN,"type":"...","url":"/notes/...","date":"...","title":"...",...}
  const results: EfluxNote[] = []
  const noteRe =
    /\{"id":(\d+),"type":"[^"]*","url":"(\/notes\/[^"]+)","date":"([^"]+)","title":"([^"]+)","authors":"([^"]*)","previewtext":(?:null|"[^"]*"),"previewimage":(\{[^}]+\}|null)/g

  for (const m of full.matchAll(noteRe)) {
    let previewimage: EfluxNote['previewimage'] = null
    try {
      previewimage = JSON.parse(m[6])
    } catch {
      // null
    }
    results.push({
      id: Number(m[1]),
      url: m[2],
      date: m[3],
      title: m[4].trim(),
      authors: m[5].trim(),
      previewtext: null,
      previewimage,
    })
  }

  return results
}

export async function fetchEflux(
  source: Source,
  page: number
): Promise<FetcherResult> {
  // Notes are all on one page — fetch and paginate client-side
  const res = await fetch(`${source.url}/notes/`, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    next: { revalidate: 1800 },
  })

  if (!res.ok) {
    throw new Error(`e-flux notes error ${res.status}`)
  }

  const html = await res.text()
  const all = extractNotes(html)

  const pageSize = 20
  const start = (page - 1) * pageSize
  const slice = all.slice(start, start + pageSize)
  const hasMore = all.length > start + pageSize

  const posts: Post[] = slice.map((note) => ({
    id: `${source.id}-${note.id}`,
    title: note.title,
    url: `${source.url}${note.url}`,
    image: note.previewimage?.src ?? undefined,
    excerpt: note.authors ? `By ${note.authors}` : undefined,
    date: new Date(note.date).toISOString(),
    sourceId: source.id,
    sourceName: source.name,
    sourceColor: source.color,
  }))

  return { posts, nextPage: hasMore ? page + 1 : undefined, hasMore }
}
