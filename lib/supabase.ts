import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.SUPABASE_URL ?? ''
    const key = process.env.SUPABASE_ANON_KEY ?? ''
    // createClient will still work; queries will fail with auth errors if vars are missing
    _client = createClient(url || 'https://placeholder.supabase.co', key || 'placeholder')
  }
  return _client
}

export function envStatus() {
  return {
    hasUrl: !!process.env.SUPABASE_URL,
    hasKey: !!process.env.SUPABASE_ANON_KEY,
  }
}
