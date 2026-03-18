import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

const BUCKET = 'space-media'

export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const ext = file.name.split('.').pop() ?? 'bin'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await getSupabase()
    .storage
    .from(BUCKET)
    .upload(filename, buffer, { contentType: file.type, upsert: false })

  if (error) {
    console.error('Storage upload error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: urlData } = getSupabase().storage.from(BUCKET).getPublicUrl(filename)
  return NextResponse.json({ url: urlData.publicUrl })
}
