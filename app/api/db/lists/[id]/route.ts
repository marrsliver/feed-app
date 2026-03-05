import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const update: Record<string, unknown> = {}
  if (body.name !== undefined) update.name = body.name
  if (body.postIds !== undefined) update.post_ids = body.postIds
  const { error } = await getSupabase().from('saved_lists').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error } = await getSupabase().from('saved_lists').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
