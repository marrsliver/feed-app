import * as cheerio from 'cheerio'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')

  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; feed-app/1.0)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const html = await res.text()
    const $ = cheerio.load(html)

    const og = (prop: string) =>
      $(`meta[property="og:${prop}"]`).attr('content') ??
      $(`meta[name="og:${prop}"]`).attr('content') ??
      undefined

    const title =
      og('title') ??
      $('title').text().trim() ??
      undefined

    const image = og('image')
    const description =
      og('description') ??
      $('meta[name="description"]').attr('content') ??
      undefined

    const siteName =
      og('site_name') ??
      new URL(url).hostname.replace(/^www\./, '') ??
      undefined

    return NextResponse.json({ title, image, description, siteName })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
