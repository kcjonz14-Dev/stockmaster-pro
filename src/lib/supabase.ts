// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true }
})

export function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}
