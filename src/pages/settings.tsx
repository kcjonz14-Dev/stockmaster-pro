// src/pages/settings.tsx
import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/useAuth'
import { supabase } from '../lib/supabase'

export default function SettingsPage() {
  const { profile, loading, signOut } = useAuth(true)
  const [bizId, setBizId] = useState('')
  const [bizName, setBizName] = useState('')
  const [branch, setBranch] = useState('')
  const [schedId, setSchedId] = useState('')
  const [reportEmail, setReportEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState({ msg: '', ok: true })

  function showToast(msg: string, ok = true) { setToast({ msg, ok }); setTimeout(() => setToast({ msg: '', ok: true }), 3500) }

  useEffect(() => {
    if (!profile) return
    Promise.all([
      supabase.from('business_settings').select('*').limit(1).single(),
      supabase.from('report_schedule').select('*').limit(1).single(),
    ]).then(([{ data: b }, { data: s }]) => {
      if (b) { setBizId((b as any).id); setBizName((b as any).business_name ?? ''); setBranch((b as any).branch ?? '') }
      if (s) { setSchedId((s as any).id); setReportEmail((s as any).recipient_email ?? '') }
    })
  }, [profile])

  async function saveBiz(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      await supabase.from('business_settings').update({ business_name: bizName, branch }).eq('id', bizId)
      showToast('Business name updated — changes appear immediately across the system.')
    } catch { showToast('Error saving.', false) } finally { setSaving(false) }
  }

  async function saveReport(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      await supabase.from('report_schedule').update({ recipient_email: reportEmail }).eq('id', schedId)
      showToast('Report email saved.')
    } catch { showToast('Error saving.', false) } finally { setSaving(false) }
  }

  if (loading || !profile) return <div className="loading"><span className="spinner dark" /></div>

  return (
    <Layout profile={profile} onSignOut={signOut}>
      <div className="page">
        <div className="page-title">Settings</div>
        <div className="page-sub">System configuration — admin only</div>

        {toast.msg && <div className={`alert ${toast.ok ? 'success' : 'danger'}`} style={{ marginBottom: 20 }}>{toast.msg}</div>}

        <div className="two-col">
          <div className="card">
            <div className="card-title">Business identity</div>
            <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>
              Your business name appears on the sidebar, reports, and all exports. Change it here at any time — no reinstall needed.
            </p>
            <form onSubmit={saveBiz}>
              <div className="fgroup">
                <label className="flabel">Business name *</label>
                <input className="finput" value={bizName} onChange={e => setBizName(e.target.value)} required placeholder="e.g. Alhaji Musa Building Materials" />
              </div>
              <div className="fgroup">
                <label className="flabel">Branch / Location (optional)</label>
                <input className="finput" value={branch} onChange={e => setBranch(e.target.value)} placeholder="e.g. Kano main store" />
              </div>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? <span className="spinner" /> : 'Save business name'}
              </button>
            </form>
          </div>

          <div className="card">
            <div className="card-title">Security overview</div>
            {[
              ['Role-based access', 'Staff cannot see admin data or notifications'],
              ['Notifications', 'Admin-only inbox — staff never see it'],
              ['Session management', 'Managed by Supabase Auth'],
              ['Data encryption', 'At rest and in transit'],
              ['Audit logging', 'All actions permanently recorded'],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--gray-100)', fontSize: 13 }}>
                <span style={{ color: 'var(--gray-500)' }}>{label}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: 'var(--brand)' }}>✓</span>
                  <span style={{ fontWeight: 500, fontSize: 12 }}>{val}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ maxWidth: 520 }}>
          <div className="card-title">Biweekly report email</div>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>
            Reports are generated automatically in your Notifications inbox every 14 days. Optionally, enter an email to also receive them by email.
          </p>
          <form onSubmit={saveReport}>
            <div className="fgroup">
              <label className="flabel">Admin email address</label>
              <input className="finput" type="email" value={reportEmail} onChange={e => setReportEmail(e.target.value)} placeholder="admin@yourbusiness.ng" />
            </div>
            <div style={{ background: 'var(--brand-light)', border: '1px solid var(--brand-mid)', borderRadius: 'var(--r-md)', padding: '10px 12px', marginBottom: 14, fontSize: 12, color: 'var(--brand-dark)', display: 'flex', gap: 8 }}>
              <span>🔔</span>
              <span>Reports always appear in your <strong>Notifications</strong> inbox — even without an email address configured.</span>
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? <span className="spinner" /> : 'Save report email'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  )
}
