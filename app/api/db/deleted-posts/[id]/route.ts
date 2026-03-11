import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error } = await getSupabase().from('deleted_posts').delete().eq('post_id', id)
  if (error) { console.error(error); return NextResponse.json({ error: 'Database error' }, { status: 500 }) }
  return NextResponse.json({ ok: true })
}
