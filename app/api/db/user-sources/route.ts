import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await getSupabase()
    .from('user_sources')
    .select('*')
    .order('added_at', { ascending: true })
  if (error) { console.error(error); return NextResponse.json({ error: 'Database error' }, { status: 500 }) }
  return NextResponse.json(
    (data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      url: r.url,
      feedUrl: r.feed_url ?? '',
      color: r.color,
      type: r.type ?? 'rss',
      apiPath: r.api_path ?? undefined,
      inFeed: r.in_feed,
      addedAt: r.added_at,
      isStatic: r.is_static ?? false,
      feedGroup: r.feed_group ?? undefined,
      categoryId: r.category_id ?? undefined,
      industryId: r.industry_id ?? undefined,
      tags: r.tags ?? [],
    }))
  )
}

export async function POST(req: Request) {
  const { id, name, url, feedUrl, color, type, apiPath, inFeed, addedAt, isStatic, feedGroup, categoryId, industryId, tags } = await req.json()
  const { error } = await getSupabase()
    .from('user_sources')
    .insert({
      id,
      name,
      url,
      feed_url: feedUrl ?? '',
      color,
      type: type ?? 'rss',
      api_path: apiPath ?? null,
      in_feed: inFeed,
      added_at: addedAt,
      is_static: isStatic ?? false,
      feed_group: feedGroup ?? null,
      category_id: categoryId ?? null,
      industry_id: industryId ?? null,
      tags: tags ?? [],
    })
  if (error) { console.error(error); return NextResponse.json({ error: 'Database error' }, { status: 500 }) }
  return NextResponse.json({ ok: true })
}
