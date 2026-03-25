import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { parseBody, requireFields } from '@/lib/apiHelpers'

export async function GET() {
  const { data, error } = await getSupabase()
    .from('source_categories')
    .select('*')
    .order('name', { ascending: true })
  if (error) { console.error(error); return NextResponse.json({ error: 'Database error' }, { status: 500 }) }
  return NextResponse.json((data ?? []).map((r) => ({ id: r.id, name: r.name })))
}

export async function POST(req: Request) {
  const { body, error: parseError } = await parseBody(req)
  if (parseError) return parseError
  const fieldError = requireFields(body, ['id', 'name'])
  if (fieldError) return fieldError
  const { id, name } = body
  const { error } = await getSupabase().from('source_categories').insert({ id, name })
  if (error) { console.error(error); return NextResponse.json({ error: 'Database error' }, { status: 500 }) }
  return NextResponse.json({ ok: true })
}
