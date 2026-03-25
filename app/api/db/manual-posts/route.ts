import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { parseBody, requireFields } from '@/lib/apiHelpers'

export async function GET() {
  const { data, error } = await getSupabase()
    .from('manual_posts')
    .select('*')
    .order('added_at', { ascending: false })
  if (error) { console.error(error); return NextResponse.json({ error: 'Database error' }, { status: 500 }) }
  return NextResponse.json(
    (data ?? []).map((r) => ({ feedId: r.feed_id, post: r.post_data, addedAt: r.added_at }))
  )
}

export async function POST(req: Request) {
  const { body, error: parseError } = await parseBody(req)
  if (parseError) return parseError
  const fieldError = requireFields(body, ['feedId', 'post'])
  if (fieldError) return fieldError
  const { feedId, post, addedAt } = body
  const { error } = await getSupabase()
    .from('manual_posts')
    .insert({ id: (post as Record<string, unknown>).id, feed_id: feedId, post_data: post, added_at: addedAt })
  if (error) { console.error(error); return NextResponse.json({ error: 'Database error' }, { status: 500 }) }
  return NextResponse.json({ ok: true })
}
