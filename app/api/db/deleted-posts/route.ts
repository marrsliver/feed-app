import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await getSupabase()
    .from('deleted_posts')
    .select('*')
    .order('deleted_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(
    (data ?? []).map((r) => ({
      post: r.post_data,
      feedId: r.feed_id,
      wasManual: r.was_manual,
      deletedAt: r.deleted_at,
    }))
  )
}

export async function POST(req: Request) {
  const { post, feedId, wasManual, deletedAt } = await req.json()
  const { error } = await getSupabase()
    .from('deleted_posts')
    .upsert({ post_id: post.id, post_data: post, feed_id: feedId, was_manual: wasManual, deleted_at: deletedAt })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
