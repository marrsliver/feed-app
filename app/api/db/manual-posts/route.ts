import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await getSupabase()
    .from('manual_posts')
    .select('*')
    .order('added_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(
    (data ?? []).map((r) => ({ feedId: r.feed_id, post: r.post_data, addedAt: r.added_at }))
  )
}

export async function POST(req: Request) {
  const { feedId, post, addedAt } = await req.json()
  const { error } = await getSupabase()
    .from('manual_posts')
    .insert({ id: post.id, feed_id: feedId, post_data: post, added_at: addedAt })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
