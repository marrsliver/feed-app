import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('saved_lists')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(
    (data ?? []).map((r) => ({ id: r.id, name: r.name, postIds: r.post_ids, createdAt: r.created_at }))
  )
}

export async function POST(req: Request) {
  const { id, name, postIds, createdAt } = await req.json()
  const { error } = await supabase
    .from('saved_lists')
    .insert({ id, name, post_ids: postIds, created_at: createdAt })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
