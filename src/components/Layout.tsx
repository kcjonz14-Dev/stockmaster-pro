// src/components/Layout.tsx
import { useEffect, useState, ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/types'

interface Props { children: ReactNode; profile: Profile; onSignOut: () => void; }

export default function Layout({ children, profile, onSignOut }: Props) {
  const router = useRouter()
  const [bizName, setBizName] = useState('StockMaster Pro')
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    supabase.from('business_settings').select('business_name').limit(1).single()
      .then(({ data }) => { if (data) setBizName((data as any).business_name) })

    if (profile.role === 'admin') {
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('is_read', false)
        .then(({ count }) => setUnread(count ?? 0))

      const ch = supabase.channel('notif-badge')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
          supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('is_read', false)
            .then(({ count }) => setUnread(count ?? 0))
        }).subscribe()
      return () => { supabase.removeChannel(ch) }
    }
  }, [profile.role])

  const isAdmin = profile.role === 'admin'
  const initials = profile.full_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  const nav = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/inventory', label: 'Inventory' },
    { href: '/add-stock', label: 'Add stock' },
    { href: '/record-sale', label: 'Record sale' },
    { href: '/reports', label: 'Reports' },
    ...(isAdmin ? [
      { href: '/notifications', label: 'Notifications', badge: unread },
      { href: '/users', label: 'User management' },
      { href: '/settings', label: 'Settings' },
    ] : []),
  ]

  return (
    <div className="shell">
      <aside className="sidebar">
        {/* Logo */}
        <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--gray-200)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, background: 'var(--brand)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M20 7H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM4 5h16V3H4v2z"/></svg>
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bizName}</div>
              <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>Inventory system</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '12px 0', flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--gray-500)', padding: '0 16px', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.5px' }}>Menu</div>
          {nav.map(n => (
            <Link key={n.href} href={n.href} className={`nav-link ${router.pathname === n.href ? 'active' : ''}`}>
              <span>{n.label}</span>
              {(n as any).badge > 0 && (
                <span style={{ background: '#E24B4A', color: 'white', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 20 }}>
                  {(n as any).badge > 99 ? '99+' : (n as any).badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: 14, borderTop: '1px solid var(--gray-200)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
            <div className="avatar" style={{ background: isAdmin ? 'var(--brand-light)' : 'var(--blue-light)', color: isAdmin ? 'var(--brand-dark)' : 'var(--blue)' }}>
              {initials}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.full_name}</div>
              <div style={{ fontSize: 11, color: 'var(--gray-500)', textTransform: 'capitalize' }}>{profile.role}</div>
            </div>
          </div>
          <button className="btn btn-full" style={{ fontSize: 12 }} onClick={onSignOut}>Sign out</button>
        </div>
      </aside>

      <div className="main">{children}</div>
    </div>
  )
}
