import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { name } = await req.json()
  const { error } = await getSupabase().from('source_categories').update({ name }).eq('id', id)
  if (error) { console.error(error); return NextResponse.json({ error: 'Database error' }, { status: 500 }) }
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // Null out category_id on all sources that use this category first
  await getSupabase().from('user_sources').update({ category_id: null }).eq('category_id', id)
  const { error } = await getSupabase().from('source_categories').delete().eq('id', id)
  if (error) { console.error(error); return NextResponse.json({ error: 'Database error' }, { status: 500 }) }
  return NextResponse.json({ ok: true })
}
