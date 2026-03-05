import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('user_sources')
    .select('*')
    .order('added_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(
    (data ?? []).map((r) => ({
      id: r.id, name: r.name, url: r.url, feedUrl: r.feed_url,
      color: r.color, inFeed: r.in_feed, addedAt: r.added_at,
    }))
  )
}

export async function POST(req: Request) {
  const { id, name, url, feedUrl, color, inFeed, addedAt } = await req.json()
  const { error } = await supabase
    .from('user_sources')
    .insert({ id, name, url, feed_url: feedUrl, color, in_feed: inFeed, added_at: addedAt })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
