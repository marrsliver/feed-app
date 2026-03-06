import { NextResponse } from 'next/server'
import { envStatus, getSupabase } from '@/lib/supabase'

export async function GET() {
  const env = envStatus()
  try {
    const { error } = await getSupabase().from('user_sources').select('id').limit(1)
    return NextResponse.json({ ...env, dbOk: !error, dbError: error?.message ?? null })
  } catch (e) {
    return NextResponse.json({ ...env, dbOk: false, dbError: String(e) })
  }
}
