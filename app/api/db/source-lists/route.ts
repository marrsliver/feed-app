import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await getSupabase()
    .from('source_lists')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(
    (data ?? []).map((r) => ({ id: r.id, name: r.name, sourceIds: r.source_ids ?? [], createdAt: r.created_at }))
  )
}

export async function POST(req: Request) {
  const { id, name, sourceIds, createdAt } = await req.json()
  const { error } = await getSupabase()
    .from('source_lists')
    .insert({ id, name, source_ids: sourceIds ?? [], created_at: createdAt })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
