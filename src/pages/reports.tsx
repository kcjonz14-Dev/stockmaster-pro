// src/pages/reports.tsx
import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/useAuth'
import { supabase } from '../lib/supabase'
import { formatNaira, formatDate, primaryQty, secondaryQty, productValue, isLowStock } from '../lib/utils'
import type { Product, ReportSchedule } from '../lib/types'

export default function ReportsPage() {
  const { profile, loading, signOut } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [schedule, setSchedule] = useState<ReportSchedule | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [toast, setToast] = useState({ msg: '', ok: true })

  useEffect(() => {
    if (!profile) return
    Promise.all([
      supabase.from('products').select('*').eq('is_active', true).order('category').order('name'),
      supabase.from('report_schedule').select('*').limit(1).single(),
    ]).then(([{ data: prods }, { data: sched }]) => {
      setProducts((prods as Product[]) ?? [])
      setSchedule(sched as ReportSchedule)
    })
  }, [profile])

  function showToast(msg: string, ok = true) { setToast({ msg, ok }); setTimeout(() => setToast({ msg: '', ok: true }), 4000) }

  async function generateReport() {
    setGenerating(true)
    try {
      const res = await fetch('/api/reports/send', { method: 'POST' })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error)
      showToast('Report generated and added to your Notifications inbox.')
    } catch (err: any) {
      showToast(err.message ?? 'Failed.', false)
    } finally { setGenerating(false) }
  }

  function exportCSV() {
    const header = 'Product,SKU,Category,Primary Qty,Secondary Qty,Unit Price (NGN),Stock Value (NGN),Status'
    const rows = products.map(p => [
      `"${p.name}"`, p.sku, p.category, primaryQty(p), secondaryQty(p),
      p.unit_price, productValue(p), isLowStock(p) ? 'Low stock' : 'OK'
    ].join(','))
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `stock-report-${new Date().toISOString().split('T')[0]}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  if (loading || !profile) return <div className="loading"><span className="spinner dark" /></div>

  const totalVal = products.reduce((s, p) => s + productValue(p), 0)
  const low = products.filter(isLowStock)

  return (
    <Layout profile={profile} onSignOut={signOut}>
      <div className="page">
        <div className="page-title">Reports</div>
        <div className="page-sub">Biweekly stock summaries delivered to your notifications inbox</div>

        {toast.msg && <div className={`alert ${toast.ok ? 'success' : 'danger'}`} style={{ marginBottom: 20 }}>{toast.msg}</div>}

        <div className="two-col">
          <div className="card">
            <div className="card-title">Report schedule</div>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse', marginBottom: 16 }}>
              <tbody>
                {[
                  ['Frequency', 'Every 14 days'],
                  ['Delivery', 'In-app notifications + email'],
                  ['Last generated', schedule?.last_sent_at ? formatDate(schedule.last_sent_at) : 'Not yet'],
                  ['Next scheduled', schedule?.next_send_at ? formatDate(schedule.next_send_at) : '—'],
                  ['Email recipient', schedule?.recipient_email || 'Not configured (set in Settings)'],
                ].map(([label, val]) => (
                  <tr key={label}>
                    <td style={{ padding: '6px 0', color: 'var(--gray-500)', borderBottom: '1px solid var(--gray-100)', width: '42%' }}>{label}</td>
                    <td style={{ padding: '6px 0', borderBottom: '1px solid var(--gray-100)', fontWeight: label === 'Next scheduled' ? 600 : 400, color: label === 'Next scheduled' ? 'var(--brand)' : 'inherit' }}>{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="btn" onClick={() => setShowPreview(v => !v)}>
                {showPreview ? 'Hide preview' : 'Preview stock report'}
              </button>
              {profile.role === 'admin' && (
                <button className="btn btn-primary" onClick={generateReport} disabled={generating}>
                  {generating ? <span className="spinner" /> : 'Generate report now'}
                </button>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-title">Manual export</div>
            <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>Download current inventory any time.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              <button className="btn btn-full" onClick={exportCSV}>Export as CSV (Excel-compatible)</button>
              <button className="btn btn-full" onClick={() => window.print()}>Print stock list</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="mcard success">
                <div className="mcard-label">Total value</div>
                <div className="mcard-value" style={{ fontSize: 18 }}>{formatNaira(totalVal)}</div>
              </div>
              <div className={`mcard ${low.length ? 'danger' : ''}`}>
                <div className="mcard-label">Low-stock items</div>
                <div className="mcard-value" style={{ fontSize: 18 }}>{low.length}</div>
              </div>
            </div>
          </div>
        </div>

        {showPreview && (
          <div className="card" style={{ background: 'var(--brand-light)', borderColor: 'var(--brand-mid)' }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--brand-dark)', marginBottom: 12 }}>
              Stock report — {new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {['Product', 'Primary qty', 'Secondary qty', 'Stock value', 'Status'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '7px 8px', color: 'var(--brand-dark)', background: 'rgba(255,255,255,.5)', borderBottom: '1px solid var(--brand-mid)', fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td style={{ padding: '8px', borderBottom: '1px solid var(--brand-mid)', color: 'var(--brand-dark)', fontWeight: 500 }}>{p.name}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid var(--brand-mid)', color: 'var(--brand-dark)' }}>{primaryQty(p)}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid var(--brand-mid)', color: 'var(--brand-dark)' }}>{secondaryQty(p)}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid var(--brand-mid)', color: 'var(--brand-dark)' }}>{formatNaira(productValue(p))}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid var(--brand-mid)' }}>
                      <span className={`badge ${isLowStock(p) ? 'badge-red' : 'badge-green'}`}>{isLowStock(p) ? 'Low stock' : 'OK'}</span>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={3} style={{ padding: '8px', fontWeight: 700, color: 'var(--brand-dark)' }}>Total</td>
                  <td style={{ padding: '8px', fontWeight: 700, color: 'var(--brand-dark)' }}>{formatNaira(totalVal)}</td>
                  <td style={{ padding: '8px' }}><span className={`badge ${low.length ? 'badge-red' : 'badge-green'}`}>{low.length} alert{low.length !== 1 ? 's' : ''}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
