import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.SUPABASE_URL ?? ''
    // Use service role key server-side — bypasses RLS, never exposed to the client
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? ''
    _client = createClient(url || 'https://placeholder.supabase.co', key || 'placeholder')
  }
  return _client
}
