// src/pages/notifications.tsx
import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/useAuth'
import { supabase } from '../lib/supabase'
import { formatDateTime } from '../lib/utils'
import type { Notification } from '../lib/types'

const SEV: Record<string, { bg: string; color: string; border: string; dot: string }> = {
  critical: { bg: 'var(--red-light)',   color: 'var(--red)',   border: '#F7C1C1', dot: '#E24B4A' },
  warning:  { bg: 'var(--amber-light)', color: 'var(--amber)', border: '#FAC775', dot: '#EF9F27' },
  success:  { bg: 'var(--green-light)', color: 'var(--green)', border: '#C0DD97', dot: '#639922' },
  info:     { bg: 'var(--blue-light)',  color: 'var(--blue)',  border: '#B5D4F4', dot: '#378ADD' },
}
const TYPE_LABEL: Record<string, string> = {
  low_stock: 'Low stock', stock_in: 'Stock received',
  sale: 'Sale', report_ready: 'Report', system: 'System',
}

type Filter = 'all' | 'unread' | 'critical' | 'stock_in' | 'sale' | 'report_ready'

export default function NotificationsPage() {
  const { profile, loading, signOut } = useAuth(true)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [dataLoading, setDataLoading] = useState(true)

  async function load() {
    const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100)
    setNotifications((data as Notification[]) ?? [])
    setDataLoading(false)
  }

  useEffect(() => {
    if (!profile) return
    load()
    const ch = supabase.channel('notifs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [profile])

  async function markRead(id: string) {
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  async function markAllRead() {
    const ids = notifications.filter(n => !n.is_read).map(n => n.id)
    if (!ids.length) return
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).in('id', ids)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  async function deleteNotif(id: string) {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read
    if (filter === 'critical') return n.severity === 'critical'
    if (['stock_in', 'sale', 'report_ready'].includes(filter)) return n.type === filter
    return true
  })

  const unread = notifications.filter(n => !n.is_read).length
  const critical = notifications.filter(n => n.severity === 'critical' && !n.is_read).length

  if (loading || !profile) return <div className="loading"><span className="spinner dark" /></div>

  return (
    <Layout profile={profile} onSignOut={signOut}>
      <div className="page">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
          <div>
            <div className="page-title">
              Notifications
              {unread > 0 && (
                <span style={{ marginLeft: 10, background: '#E24B4A', color: 'white', fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                  {unread} unread
                </span>
              )}
            </div>
            <div className="page-sub">Admin-only inbox — all stock alerts, activity, and reports</div>
          </div>
          {unread > 0 && <button className="btn btn-sm" onClick={markAllRead}>Mark all as read</button>}
        </div>

        {critical > 0 && (
          <div className="alert danger">
            <span>⚠</span>
            <span><strong>{critical} critical alert{critical > 1 ? 's' : ''}</strong> require your attention.</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 16 }}>
          {([
            { id: 'all', label: 'All' },
            { id: 'unread', label: `Unread (${unread})` },
            { id: 'critical', label: 'Alerts' },
            { id: 'stock_in', label: 'Stock in' },
            { id: 'sale', label: 'Sales' },
            { id: 'report_ready', label: 'Reports' },
          ] as { id: Filter; label: string }[]).map(f => (
            <button key={f.id} className={`btn btn-sm ${filter === f.id ? 'btn-primary' : ''}`} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>

        {dataLoading ? <div className="loading"><span className="spinner dark" /></div> : (
          <>
            {filtered.length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>🔔</div>
                <div style={{ color: 'var(--gray-500)' }}>No notifications in this category</div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map(n => {
                const s = SEV[n.severity] ?? SEV.info
                return (
                  <div key={n.id} style={{
                    background: n.is_read ? 'var(--gray-50)' : 'white',
                    border: `1px solid ${n.is_read ? 'var(--gray-200)' : s.border}`,
                    borderLeft: `4px solid ${n.is_read ? 'var(--gray-300)' : s.dot}`,
                    borderRadius: 'var(--r-md)', padding: '12px 14px',
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    opacity: n.is_read ? 0.7 : 1,
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.is_read ? 'var(--gray-300)' : s.dot, marginTop: 5, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{n.title}</span>
                        <span style={{ background: s.bg, color: s.color, fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 20 }}>
                          {TYPE_LABEL[n.type] ?? n.type}
                        </span>
                        {!n.is_read && <span style={{ background: 'var(--blue-light)', color: 'var(--blue)', fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 20 }}>New</span>}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--gray-700)', marginBottom: 4 }}>{n.message}</div>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{formatDateTime(n.created_at)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {!n.is_read && <button className="btn btn-sm" onClick={() => markRead(n.id)}>Mark read</button>}
                      <button className="btn btn-sm btn-danger" onClick={() => deleteNotif(n.id)}>×</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
