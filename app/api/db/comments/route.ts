import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { parseBody, requireFields } from '@/lib/apiHelpers'

export async function GET() {
  const { data, error } = await getSupabase()
    .from('comments')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) { console.error(error); return NextResponse.json({ error: 'Database error' }, { status: 500 }) }
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const { body, error: parseError } = await parseBody(req)
  if (parseError) return parseError
  const fieldError = requireFields(body, ['id', 'entityId', 'text', 'createdAt'])
  if (fieldError) return fieldError
  const { id, entityId, text, createdAt } = body
  const { error } = await getSupabase()
    .from('comments')
    .insert({ id, entity_id: entityId, text, created_at: createdAt })
  if (error) { console.error(error); return NextResponse.json({ error: 'Database error' }, { status: 500 }) }
  return NextResponse.json({ ok: true })
}
