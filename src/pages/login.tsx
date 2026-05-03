// src/pages/login.tsx
import { useState } from 'react'
import { useRouter } from 'next/router'
import { createClient } from '@supabase/supabase-js'

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
      const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data, error: authErr } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (authErr) throw new Error(authErr.message)
      if (!data.user) throw new Error('Login failed. Please try again.')

      const { data: profile, error: profErr } = await client
        .from('profiles')
        .select('role, is_active, full_name')
        .eq('id', data.user.id)
        .single()

      if (profErr || !profile) throw new Error('Account profile not found. Contact your admin.')
      if (!profile.is_active) throw new Error('Your account has been deactivated.')
      if (profile.role !== role) throw new Error(`This account is registered as "${profile.role}". Please select ${profile.role} and try again.`)

      router.replace('/dashboard')
    } catch (err: any) {
      setError(err.message ?? 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F1F3F5', padding: 20 }}>
      <div style={{ background: 'white', border: '1px solid #E9ECEF', borderRadius: 12, padding: 36, width: '100%', maxWidth: 380 }}>
        
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, background: '#1D9E75', borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
              <path d="M20 7H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM4 5h16V3H4v2z"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', color: '#212529' }}>StockMaster Pro</h1>
          <p style={{ fontSize: 13, color: '#ADB5BD', margin: 0 }}>Cement & rod inventory system</p>
        </div>

        {/* Role switch */}
        <div style={{ display: 'flex', background: '#F1F3F5', borderRadius: 8, padding: 3, gap: 3, marginBottom: 20 }}>
          {(['admin', 'staff'] as const).map(r => (
            <div key={r} onClick={() => setRole(r)} style={{
              flex: 1, textAlign: 'center', padding: '7px', borderRadius: 6,
              fontSize: 13, cursor: 'pointer', fontWeight: 500,
              background: role === r ? 'white' : 'transparent',
              color: role === r ? '#212529' : '#ADB5BD',
              border: role === r ? '1px solid #E9ECEF' : '1px solid transparent',
            }}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </div>
          ))}
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#495057', display: 'block', marginBottom: 5 }}>
              Email address
            </label>
            <input
              type="email" required value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={role === 'admin' ? 'admin@yourbusiness.ng' : 'staff@yourbusiness.ng'}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #DEE2E6', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#495057', display: 'block', marginBottom: 5 }}>
              Password
            </label>
            <input
              type="password" required value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #DEE2E6', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
            />
          </div>

          {error && (
            <div style={{ background: '#FCEBEB', border: '1px solid #F7C1C1', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#A32D2D', marginBottom: 14 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '10px', background: '#1D9E75', color: 'white',
            border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
            fontFamily: 'inherit',
          }}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div style={{ marginTop: 14, padding: '10px 12px', background: '#F8F9FA', borderRadius: 8, fontSize: 11, color: '#ADB5BD', display: 'flex', gap: 6 }}>
          <span>🔒</span>
          <span>Secured with Supabase Auth • Role-protected access • All actions logged</span>
        </div>
      </div>
    </div>
  )
}
