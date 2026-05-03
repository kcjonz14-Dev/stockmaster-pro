// src/pages/inventory.tsx
import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/useAuth'
import { supabase } from '../lib/supabase'
import { formatNaira, primaryQty, secondaryQty, stockStatus } from '../lib/utils'
import type { Product } from '../lib/types'

export default function InventoryPage() {
  const { profile, loading, signOut } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [filter, setFilter] = useState<'all' | 'cement' | 'rod'>('all')
  const [search, setSearch] = useState('')
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    supabase.from('products').select('*').eq('is_active', true).order('category').order('name')
      .then(({ data }) => { setProducts((data as Product[]) ?? []); setDataLoading(false) })

    const ch = supabase.channel('inv')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        supabase.from('products').select('*').eq('is_active', true).order('category').order('name')
          .then(({ data }) => setProducts((data as Product[]) ?? []))
      }).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [profile])

  if (loading || !profile) return <div className="loading"><span className="spinner dark" /></div>

  const filtered = products
    .filter(p => filter === 'all' || p.category === filter)
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()))

  function StatusBadge({ p }: { p: Product }) {
    const s = stockStatus(p)
    const map = { ok: ['badge-green', 'In stock'], warning: ['badge-amber', 'Warning'], critical: ['badge-red', 'Low stock'] }
    const [cls, label] = map[s]
    return <span className={`badge ${cls}`}>{label}</span>
  }

  return (
    <Layout profile={profile} onSignOut={signOut}>
      <div className="page">
        <div className="page-title">Inventory</div>
        <div className="page-sub">All stock — bags/tonnes for cement, bundles/lengths for rods</div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['all', 'cement', 'rod'] as const).map(f => (
              <button key={f} className={`btn ${filter === f ? 'btn-primary' : ''}`} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All products' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <input className="finput" style={{ width: 220 }} placeholder="Search by name or SKU..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--gray-500)' }}>{filtered.length} product{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {dataLoading ? <div className="loading"><span className="spinner dark" /></div> : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Product</th><th>SKU</th><th>Category</th><th>Primary qty</th>
                  <th>Secondary qty</th><th>Unit price</th><th>Selling price</th>
                  <th>Status</th><th>Supplier</th><th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--gray-500)', padding: 32 }}>No products found</td></tr>
                )}
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--gray-500)' }}>{p.sku}</td>
                    <td><span className={`badge ${p.category === 'cement' ? 'badge-blue' : 'badge-amber'}`}>{p.category}</span></td>
                    <td style={{ fontWeight: 600 }}>{primaryQty(p)}</td>
                    <td style={{ color: 'var(--gray-500)' }}>{secondaryQty(p)}</td>
                    <td>{formatNaira(p.unit_price)}</td>
                    <td>{formatNaira(p.selling_price)}</td>
                    <td><StatusBadge p={p} /></td>
                    <td style={{ color: 'var(--gray-500)', fontSize: 12 }}>{p.supplier ?? '—'}</td>
                    <td style={{ color: 'var(--gray-500)', fontSize: 12 }}>{new Date(p.updated_at).toLocaleDateString('en-NG')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
