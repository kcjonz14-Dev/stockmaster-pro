// src/pages/dashboard.tsx
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import { useAuth } from '../lib/useAuth'
import { supabase } from '../lib/supabase'
import { formatNaira, formatDateTime, primaryQty, secondaryQty, isLowStock, productValue, barPercent, barColor } from '../lib/utils'
import type { Product, Movement, Notification } from '../lib/types'

export default function Dashboard() {
  const { profile, loading, signOut } = useAuth()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [movements, setMovements] = useState<any[]>([])
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [bizName, setBizName] = useState('StockMaster Pro')
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    async function load() {
      const [{ data: biz }, { data: prods }, { data: moves }] = await Promise.all([
        supabase.from('business_settings').select('business_name').limit(1).single(),
        supabase.from('products').select('*').eq('is_active', true).order('category').order('name'),
        supabase.from('stock_movements').select('id, movement_type, created_at, products(name)').order('created_at', { ascending: false }).limit(8),
      ])
      if (biz) setBizName((biz as any).business_name)
      setProducts((prods as Product[]) ?? [])
      setMovements(moves ?? [])

      if (profile.role === 'admin') {
        const { data: nots } = await supabase.from('notifications').select('*').eq('is_read', false).order('created_at', { ascending: false }).limit(5)
        setNotifs((nots as Notification[]) ?? [])
      }
      setDataLoading(false)
    }
    load()

    const ch = supabase.channel('dash')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, load)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stock_movements' }, load)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [profile])

  if (loading || !profile) return <div className="loading"><span className="spinner dark" /></div>

  const isAdmin = profile.role === 'admin'
  const lowStock = products.filter(isLowStock)
  const totalVal = products.reduce((s, p) => s + productValue(p), 0)
  const cementVal = products.filter(p => p.category === 'cement').reduce((s, p) => s + productValue(p), 0)
  const rodVal = products.filter(p => p.category === 'rod').reduce((s, p) => s + productValue(p), 0)

  return (
    <Layout profile={profile} onSignOut={signOut}>
      <div className="page">
        <div style={{ marginBottom: 20 }}>
          <div className="page-title">{new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <div className="page-sub">Live overview — {bizName}</div>
        </div>

        {lowStock.length > 0 && (
          <div className="alert warning" style={{ cursor: isAdmin ? 'pointer' : 'default' }} onClick={() => isAdmin && router.push('/notifications')}>
            <span>⚠</span>
            <span>
              <strong>{lowStock.length} product{lowStock.length > 1 ? 's are' : ' is'} below threshold:</strong>{' '}
              {lowStock.map(p => p.name).join(', ')}
              {isAdmin && <span style={{ marginLeft: 8, fontSize: 11, textDecoration: 'underline' }}>View notifications →</span>}
            </span>
          </div>
        )}

        {isAdmin && notifs.length > 0 && (
          <div className="alert info" style={{ cursor: 'pointer', marginBottom: 16 }} onClick={() => router.push('/notifications')}>
            <span>🔔</span>
            <span><strong>{notifs.length} unread notification{notifs.length > 1 ? 's' : ''}</strong> — {notifs[0]?.title}</span>
            <span style={{ marginLeft: 'auto', fontSize: 12, textDecoration: 'underline' }}>View all →</span>
          </div>
        )}

        <div className="mgrid">
          <div className={`mcard ${lowStock.length ? 'danger' : 'success'}`}>
            <div className="mcard-label">Low-stock alerts</div>
            <div className="mcard-value">{lowStock.length}</div>
            <div className="mcard-sub">{lowStock.length ? 'action needed' : 'all products OK'}</div>
          </div>
          <div className="mcard success">
            <div className="mcard-label">Total stock value</div>
            <div className="mcard-value">{formatNaira(totalVal)}</div>
            <div className="mcard-sub">all products</div>
          </div>
          {isAdmin ? (
            <>
              <div className="mcard">
                <div className="mcard-label">Cement value</div>
                <div className="mcard-value">{formatNaira(cementVal)}</div>
                <div className="mcard-sub">{products.filter(p => p.category === 'cement').length} products</div>
              </div>
              <div className="mcard">
                <div className="mcard-label">Rods value</div>
                <div className="mcard-value">{formatNaira(rodVal)}</div>
                <div className="mcard-sub">{products.filter(p => p.category === 'rod').length} products</div>
              </div>
            </>
          ) : (
            <>
              <div className="mcard">
                <div className="mcard-label">Products tracked</div>
                <div className="mcard-value">{products.length}</div>
                <div className="mcard-sub">cement & rods</div>
              </div>
              <div className="mcard">
                <div className="mcard-label">Next report</div>
                <div className="mcard-value" style={{ fontSize: 18 }}>14 days</div>
                <div className="mcard-sub">generated for admin</div>
              </div>
            </>
          )}
        </div>

        <div className="two-col">
          <div className="card">
            <div className="card-title">Stock levels</div>
            {dataLoading ? <div className="loading"><span className="spinner dark" /></div> : products.map(p => (
              <div key={p.id} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: 'var(--gray-700)' }}>{p.name}</span>
                  <span style={{ color: barColor(p), fontWeight: 600 }}>
                    {primaryQty(p)} <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>/ {secondaryQty(p)}</span>
                  </span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${barPercent(p)}%`, background: barColor(p) }} />
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-title">Recent activity</div>
            {movements.length === 0 && <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>No activity yet.</p>}
            {movements.map((m: any) => {
              const color = m.movement_type === 'stock_in' ? 'var(--green)' : m.movement_type === 'sale' ? 'var(--blue)' : 'var(--amber)'
              const label = m.movement_type === 'stock_in' ? 'Stock added' : m.movement_type === 'sale' ? 'Sale recorded' : 'Adjustment'
              return (
                <div key={m.id} style={{ display: 'flex', gap: 10, paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid var(--gray-100)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, marginTop: 4, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12 }}>{label} — {m.products?.name ?? 'Unknown'}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>{formatDateTime(m.created_at)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Layout>
  )
}
