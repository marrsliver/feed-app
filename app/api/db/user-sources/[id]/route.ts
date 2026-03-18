import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const update: Record<string, unknown> = {}
  if (body.inFeed !== undefined) update.in_feed = body.inFeed
  if (body.categoryId !== undefined) update.category_id = body.categoryId
  if (body.industryId !== undefined) update.industry_id = body.industryId
  if (body.tags !== undefined) update.tags = body.tags
  if (body.name !== undefined) update.name = body.name
  if (body.cards !== undefined) update.cards = body.cards

  if (body.isStatic) {
    // Static sources may not have a DB row yet — upsert with full data
    const record: Record<string, unknown> = {
      id,
      name: body.name,
      url: body.url,
      feed_url: body.feedUrl ?? '',
      type: body.type ?? 'rss',
      in_feed: body.inFeed ?? false,
      feed_group: body.feedGroup ?? '',
      added_at: body.addedAt ?? Date.now(),
      is_static: true,
      tags: body.tags ?? [],
      ...update,
    }
    if (body.categoryId !== undefined) record.category_id = body.categoryId
    if (body.industryId !== undefined) record.industry_id = body.industryId
    const { error } = await getSupabase().from('user_sources').upsert(record, { onConflict: 'id' })
    if (error) { console.error(error); return NextResponse.json({ error: 'Database error' }, { status: 500 }) }
  } else {
    const { error } = await getSupabase().from('user_sources').update(update).eq('id', id)
    if (error) { console.error(error); return NextResponse.json({ error: 'Database error' }, { status: 500 }) }
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error } = await getSupabase().from('user_sources').delete().eq('id', id)
  if (error) { console.error(error); return NextResponse.json({ error: 'Database error' }, { status: 500 }) }
  return NextResponse.json({ ok: true })
}
