import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await getSupabase()
    .from('comments')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) { console.error(error); return NextResponse.json({ error: 'Database error' }, { status: 500 }) }
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const { id, entityId, text, createdAt } = await req.json()
  const { error } = await getSupabase()
    .from('comments')
    .insert({ id, entity_id: entityId, text, created_at: createdAt })
  if (error) { console.error(error); return NextResponse.json({ error: 'Database error' }, { status: 500 }) }
  return NextResponse.json({ ok: true })
}
