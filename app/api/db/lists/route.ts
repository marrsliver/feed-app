import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await getSupabase()
    .from('saved_lists')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) { console.error(error); return NextResponse.json({ error: 'Database error' }, { status: 500 }) }
  return NextResponse.json(
    (data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      postIds: r.post_ids,
      postData: r.post_data ?? {},
      createdAt: r.created_at,
      description: r.description ?? undefined,
      items: r.items ?? [],
      updatedAt: r.updated_at ?? undefined,
    }))
  )
}

export async function POST(req: Request) {
  const { id, name, postIds, postData, createdAt, description, items, updatedAt } = await req.json()
  const { error } = await getSupabase()
    .from('saved_lists')
    .insert({ id, name, post_ids: postIds, post_data: postData ?? {}, created_at: createdAt, description: description ?? null, items: items ?? [], updated_at: updatedAt ?? null })
  if (error) { console.error(error); return NextResponse.json({ error: 'Database error' }, { status: 500 }) }
  return NextResponse.json({ ok: true })
}
