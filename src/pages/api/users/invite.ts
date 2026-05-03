// src/pages/api/users/invite.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getAdminClient } from '../../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false })

  try {
    const admin = getAdminClient()
    const token = req.cookies['sb-access-token'] ?? req.headers.authorization?.replace('Bearer ', '')
    if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' })

    const { data: { user } } = await admin.auth.getUser(token)
    if (!user) return res.status(401).json({ ok: false, error: 'Unauthorized' })

    const { data: prof } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (!prof || (prof as any).role !== 'admin') return res.status(403).json({ ok: false, error: 'Admin only' })

    const { email, full_name, role } = req.body
    if (!email || !full_name || !role) return res.status(400).json({ ok: false, error: 'Missing fields.' })

    if (role === 'staff') {
      const { count } = await admin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'staff')
      if ((count ?? 0) >= 3) return res.status(400).json({ ok: false, error: 'Maximum of 3 staff accounts reached.' })
    }

    const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name, role },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
    })
    if (error) throw error

    await admin.from('profiles').insert([{ id: invited.user.id, full_name, role, is_active: true }])

    return res.json({ ok: true })
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message ?? 'Invite failed.' })
  }
}
