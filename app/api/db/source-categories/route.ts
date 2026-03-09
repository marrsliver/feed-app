import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await getSupabase()
    .from('source_categories')
    .select('*')
    .order('name', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json((data ?? []).map((r) => ({ id: r.id, name: r.name })))
}

export async function POST(req: Request) {
  const { id, name } = await req.json()
  const { error } = await getSupabase().from('source_categories').insert({ id, name })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
