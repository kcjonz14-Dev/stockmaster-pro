// src/pages/users.tsx
import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/useAuth'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/utils'
import type { Profile } from '../lib/types'

export default function UsersPage() {
  const { profile, loading, signOut } = useAuth(true)
  const [users, setUsers] = useState<Profile[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('staff')
  const [inviting, setInviting] = useState(false)
  const [toast, setToast] = useState({ msg: '', ok: true })

  function showToast(msg: string, ok = true) { setToast({ msg, ok }); setTimeout(() => setToast({ msg: '', ok: true }), 4000) }

  useEffect(() => {
    if (!profile) return
    supabase.from('profiles').select('*').order('role').order('full_name')
      .then(({ data }) => setUsers((data as Profile[]) ?? []))
  }, [profile])

  async function invite(e: React.FormEvent) {
    e.preventDefault(); setInviting(true)
    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, full_name: inviteName, role: inviteRole }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error)
      showToast(`Invitation sent to ${inviteEmail}`)
      setInviteEmail(''); setInviteName('')
      supabase.from('profiles').select('*').order('role').order('full_name').then(({ data }) => setUsers((data as Profile[]) ?? []))
    } catch (err: any) {
      showToast(err.message ?? 'Invite failed.', false)
    } finally { setInviting(false) }
  }

  async function toggleActive(u: Profile) {
    await supabase.from('profiles').update({ is_active: !u.is_active }).eq('id', u.id)
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: !x.is_active } : x))
  }

  if (loading || !profile) return <div className="loading"><span className="spinner dark" /></div>

  return (
    <Layout profile={profile} onSignOut={signOut}>
      <div className="page">
        <div className="page-title">User management</div>
        <div className="page-sub">Manage admin and staff accounts</div>

        {toast.msg && <div className={`alert ${toast.ok ? 'success' : 'danger'}`} style={{ marginBottom: 20 }}>{toast.msg}</div>}

        <div className="tbl-wrap" style={{ marginBottom: 24 }}>
          <table className="tbl">
            <thead>
              <tr><th>Name</th><th>Role</th><th>Status</th><th>Joined</th><th></th></tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.full_name}</td>
                  <td><span className={`badge ${u.role === 'admin' ? 'badge-brand' : 'badge-blue'}`}>{u.role}</span></td>
                  <td><span className={`badge ${u.is_active ? 'badge-green' : 'badge-gray'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td style={{ color: 'var(--gray-500)', fontSize: 12 }}>{formatDate(u.created_at)}</td>
                  <td>
                    {u.role !== 'admin' && (
                      <button className={`btn btn-sm ${u.is_active ? 'btn-danger' : ''}`} onClick={() => toggleActive(u)}>
                        {u.is_active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ maxWidth: 500 }}>
          <div className="card-title">Invite new staff member</div>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>An invitation email with a secure setup link will be sent automatically.</p>
          <form onSubmit={invite}>
            <div className="fgrid">
              <div className="fgroup">
                <label className="flabel">Full name *</label>
                <input className="finput" value={inviteName} onChange={e => setInviteName(e.target.value)} required placeholder="e.g. Fatima Bello" />
              </div>
              <div className="fgroup">
                <label className="flabel">Role *</label>
                <select className="fselect" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="fgroup">
              <label className="flabel">Email address *</label>
              <input className="finput" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required placeholder="staff@yourbusiness.ng" />
            </div>
            <button className="btn btn-primary" type="submit" disabled={inviting}>
              {inviting ? <span className="spinner" /> : 'Send invitation'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  )
}
