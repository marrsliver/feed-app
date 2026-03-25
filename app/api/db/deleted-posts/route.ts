import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { parseBody, requireFields } from '@/lib/apiHelpers'

export async function GET() {
  const { data, error } = await getSupabase()
    .from('deleted_posts')
    .select('*')
    .order('deleted_at', { ascending: false })
  if (error) { console.error(error); return NextResponse.json({ error: 'Database error' }, { status: 500 }) }
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
  const { body, error: parseError } = await parseBody(req)
  if (parseError) return parseError
  const fieldError = requireFields(body, ['post', 'feedId'])
  if (fieldError) return fieldError
  const { post, feedId, wasManual, deletedAt } = body
  const { error } = await getSupabase()
    .from('deleted_posts')
    .upsert({ post_id: (post as Record<string, unknown>).id, post_data: post, feed_id: feedId, was_manual: wasManual, deleted_at: deletedAt })
  if (error) { console.error(error); return NextResponse.json({ error: 'Database error' }, { status: 500 }) }
  return NextResponse.json({ ok: true })
}
