// src/pages/login.tsx
import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (authErr) throw new Error(authErr.message)
      if (!data.user) throw new Error('Login failed. Please try again.')
      router.replace('/dashboard')
    } catch (err: any) {
      setError(err.message ?? 'Login failed. Check your email and password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#F1F3F5', padding: 20
    }}>
      <div style={{
        background: 'white', border: '1px solid #E9ECEF', borderRadius: 12,
        padding: 36, width: '100%', maxWidth: 360
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52, background: '#1D9E75', borderRadius: 12,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
              <path d="M20 7H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM4 5h16V3H4v2z"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', color: '#212529' }}>StockMaster Pro</h1>
          <p style={{ fontSize: 13, color: '#ADB5BD', margin: 0 }}>Cement & rod inventory system</p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#495057', display: 'block', marginBottom: 5 }}>Email address</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #DEE2E6', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#495057', display: 'block', marginBottom: 5 }}>Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #DEE2E6', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          {error && (
            <div style={{ background: '#FCEBEB', border: '1px solid #F7C1C1', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#A32D2D', marginBottom: 16 }}>
              {error}
            </div>
          )}
          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '11px', background: loading ? '#9FE1CB' : '#1D9E75', color: 'white', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p style={{ marginTop: 16, textAlign: 'center', fontSize: 12, color: '#ADB5BD' }}>🔒 Secured • All actions are logged</p>
      </div>
    </div>
  )
}