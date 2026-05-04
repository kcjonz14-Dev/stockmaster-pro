// src/components/Layout.tsx
import { useEffect, useState, ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/types'

interface Props { children: ReactNode; profile: Profile; onSignOut: () => void }

export default function Layout({ children, profile, onSignOut }: Props) {
  const router = useRouter()
  const [bizName, setBizName] = useState('StockMaster Pro')
  const [unread, setUnread] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  const isAdmin = profile.role === 'admin'
  const initials = profile.full_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  useEffect(() => {
    supabase.from('business_settings').select('business_name').limit(1).single()
      .then(({ data }) => { if (data) setBizName((data as any).business_name) })
    if (isAdmin) {
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('is_read', false)
        .then(({ count }) => setUnread(count ?? 0))
      const ch = supabase.channel('notif-badge')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
          supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('is_read', false)
            .then(({ count }) => setUnread(count ?? 0))
        }).subscribe()
      return () => { supabase.removeChannel(ch) }
    }
  }, [isAdmin])

  useEffect(() => { setMenuOpen(false) }, [router.pathname])

  const nav = [
    { href: '/dashboard', label: 'Dashboard', icon: '▦' },
    { href: '/inventory', label: 'Inventory', icon: '≡' },
    { href: '/add-stock', label: 'Add stock', icon: '⊕' },
    { href: '/record-sale', label: 'Record sale', icon: '−' },
    { href: '/reports', label: 'Reports', icon: '↗' },
    ...(isAdmin ? [
      { href: '/notifications', label: 'Notifications', icon: '🔔', badge: unread },
      { href: '/users', label: 'User management', icon: '♟' },
      { href: '/settings', label: 'Settings', icon: '◎' },
    ] : []),
  ]

  const NavContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'white' }}>
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid #E9ECEF' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, background: '#1D9E75', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M20 7H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM4 5h16V3H4v2z"/></svg>
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bizName}</div>
            <div style={{ fontSize: 11, color: '#ADB5BD' }}>Inventory system</div>
          </div>
        </div>
      </div>
      <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#ADB5BD', padding: '0 16px', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.5px' }}>Menu</div>
        {nav.map(n => (
          <Link key={n.href} href={n.href} onClick={() => setMenuOpen(false)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '11px 16px', fontSize: 14, textDecoration: 'none',
              color: router.pathname === n.href ? '#1D9E75' : '#495057',
              background: router.pathname === n.href ? '#E1F5EE' : 'transparent',
              borderLeft: `3px solid ${router.pathname === n.href ? '#1D9E75' : 'transparent'}`,
              fontWeight: router.pathname === n.href ? 600 : 400,
            }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 15, width: 18, textAlign: 'center' }}>{n.icon}</span>
              {n.label}
            </span>
            {(n as any).badge > 0 && (
              <span style={{ background: '#E24B4A', color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>
                {(n as any).badge > 99 ? '99+' : (n as any).badge}
              </span>
            )}
          </Link>
        ))}
      </nav>
      <div style={{ padding: 14, borderTop: '1px solid #E9ECEF' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, flexShrink: 0, background: isAdmin ? '#E1F5EE' : '#E6F1FB', color: isAdmin ? '#085041' : '#185FA5' }}>
            {initials}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.full_name}</div>
            <div style={{ fontSize: 11, color: '#ADB5BD', textTransform: 'capitalize' }}>{profile.role}</div>
          </div>
        </div>
        <button onClick={onSignOut} style={{ width: '100%', padding: '8px', background: 'white', border: '1px solid #DEE2E6', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        .app-shell { display: flex; height: 100vh; overflow: hidden; }
        .desktop-sidebar { width: 220px; flex-shrink: 0; border-right: 1px solid #E9ECEF; }
        .mobile-topbar { display: none; }
        .mobile-drawer { display: none; }
        .page-area { flex: 1; overflow-y: auto; background: #F1F3F5; }
        @media (max-width: 768px) {
          .desktop-sidebar { display: none; }
          .mobile-topbar { display: flex; position: fixed; top: 0; left: 0; right: 0; height: 56px; background: white; border-bottom: 1px solid #E9ECEF; align-items: center; justify-content: space-between; padding: 0 16px; z-index: 100; }
          .mobile-drawer { display: block; }
          .page-area { padding-top: 56px; }
        }
      `}</style>

      <div className="app-shell">

        {/* Desktop sidebar */}
        <div className="desktop-sidebar">
          <NavContent />
        </div>

        {/* Mobile top bar */}
        <div className="mobile-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, background: '#1D9E75', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M20 7H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM4 5h16V3H4v2z"/></svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{bizName}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {isAdmin && unread > 0 && (
              <Link href="/notifications" onClick={() => setMenuOpen(false)} style={{ position: 'relative', textDecoration: 'none', fontSize: 22 }}>
                🔔
                <span style={{ position: 'absolute', top: -5, right: -5, background: '#E24B4A', color: 'white', fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 20 }}>
                  {unread}
                </span>
              </Link>
            )}
            <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'flex', flexDirection: 'column', gap: 5, justifyContent: 'center' }}>
              <span style={{ display: 'block', width: 24, height: 2.5, background: '#495057', borderRadius: 2, transition: 'all .2s', transform: menuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
              <span style={{ display: 'block', width: 24, height: 2.5, background: '#495057', borderRadius: 2, transition: 'all .2s', opacity: menuOpen ? 0 : 1 }} />
              <span style={{ display: 'block', width: 24, height: 2.5, background: '#495057', borderRadius: 2, transition: 'all .2s', transform: menuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        <div className="mobile-drawer">
          {/* Backdrop */}
          {menuOpen && (
            <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 150, backdropFilter: 'blur(2px)' }} />
          )}
          {/* Slide-in panel */}
          <div style={{
            position: 'fixed', top: 0, left: 0, bottom: 0, width: 270,
            zIndex: 200, transform: menuOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform .25s cubic-bezier(.4,0,.2,1)',
            boxShadow: menuOpen ? '6px 0 24px rgba(0,0,0,0.18)' : 'none',
          }}>
            <NavContent />
          </div>
        </div>

        {/* Page content */}
        <div className="page-area">
          {children}
        </div>

      </div>
    </>
  )
}