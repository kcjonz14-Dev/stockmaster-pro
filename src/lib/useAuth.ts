// src/lib/useAuth.ts
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from './supabase'
import type { Profile } from './types'

export function useAuth(requireAdmin = false) {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      const { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (!p || !p.is_active) { await supabase.auth.signOut(); router.replace('/login'); return }
      if (requireAdmin && p.role !== 'admin') { router.replace('/dashboard'); return }

      setProfile(p as Profile)
      setLoading(false)
    }
    check()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return { profile, loading, signOut }
}
