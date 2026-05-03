// src/pages/login.tsx
import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [role, setRole] = useState<'admin' | 'staff'>('admin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
      if (authErr) throw authErr
      if (!data.user) throw new Error('Login failed')

      const { data: profile } = await supabase
        .from('profiles').select('role, is_active').eq('id', data.user.id).single()

      if (!profile) throw new Error('Account not found. Contact your admin.')
      if (!profile.is_active) throw new Error('Your account has been deactivated.')
      if (profile.role !== role) throw new Error(`This is not a ${role} account. Please select the correct role.`)

      router.replace('/dashboard')
    } catch (err: any) {
      setError(err.message ?? 'Login failed. Check your details.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, background: 'var(--brand)', borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M20 7H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM4 5h16V3H4v2z"/></svg>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>StockMaster Pro</h1>
          <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>Cement & rod inventory system</p>
        </div>

        {/* Role switch */}
        <div className="role-sw">
          <div className={`role-opt ${role === 'admin' ? 'active' : ''}`} onClick={() => setRole('admin')}>Admin</div>
          <div className={`role-opt ${role === 'staff' ? 'active' : ''}`} onClick={() => setRole('staff')}>Staff</div>
        </div>

        <form onSubmit={handleLogin}>
          <div className="fgroup">
            <label className="flabel">Email address</label>
            <input className="finput" type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder={role === 'admin' ? 'admin@yourbusiness.ng' : 'staff@yourbusiness.ng'} />
          </div>
          <div className="fgroup">
            <label className="flabel">Password</label>
            <input className="finput" type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {error && <div className="alert danger" style={{ marginBottom: 12 }}>{error}</div>}
          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Sign in'}
          </button>
        </form>

        <div style={{ marginTop: 14, padding: '10px 12px', background: 'var(--gray-50)', borderRadius: 'var(--r-md)', fontSize: 11, color: 'var(--gray-500)', display: 'flex', gap: 6 }}>
          <span>🔒</span>
          <span>Secured with Supabase Auth &bull; Role-protected access &bull; All actions logged</span>
        </div>
      </div>
    </div>
  )
}
