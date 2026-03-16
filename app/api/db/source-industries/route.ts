import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await getSupabase()
    .from('source_industries')
    .select('*')
    .order('name', { ascending: true })
  if (error) { console.error(error); return NextResponse.json({ error: 'Database error' }, { status: 500 }) }
  return NextResponse.json((data ?? []).map((r) => ({ id: r.id, name: r.name })))
}

export async function POST(req: Request) {
  const { id, name } = await req.json()
  const { error } = await getSupabase().from('source_industries').insert({ id, name })
  if (error) { console.error(error); return NextResponse.json({ error: 'Database error' }, { status: 500 }) }
  return NextResponse.json({ ok: true })
}
