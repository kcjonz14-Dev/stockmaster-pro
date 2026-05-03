// src/pages/record-sale.tsx
import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/useAuth'
import { supabase } from '../lib/supabase'
import { formatNaira } from '../lib/utils'
import type { Product } from '../lib/types'

export default function RecordSalePage() {
  const { profile, loading, signOut } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState({ msg: '', ok: true })

  const [productId, setProductId] = useState('')
  const [qtyBags, setQtyBags] = useState('')
  const [qtyTonnes, setQtyTonnes] = useState('')
  const [qtyBundles, setQtyBundles] = useState('')
  const [qtyLengths, setQtyLengths] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [customer, setCustomer] = useState('')
  const [payment, setPayment] = useState('cash')
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')

  const selectedProduct = products.find(p => p.id === productId)
  const qty = selectedProduct?.category === 'cement' ? parseFloat(qtyBags) || 0 : parseInt(qtyBundles) || 0
  const total = qty * (parseFloat(salePrice) || 0)
  const insufficient = selectedProduct && (
    selectedProduct.category === 'cement' ? qty > selectedProduct.qty_bags : qty > selectedProduct.qty_bundles
  )

  useEffect(() => {
    if (!profile) return
    supabase.from('products').select('*').eq('is_active', true).order('category').order('name')
      .then(({ data }) => setProducts((data as Product[]) ?? []))
  }, [profile])

  function showToast(msg: string, ok = true) { setToast({ msg, ok }); setTimeout(() => setToast({ msg: '', ok: true }), 4000) }

  function resetForm() {
    setProductId(''); setQtyBags(''); setQtyTonnes(''); setQtyBundles(''); setQtyLengths('')
    setSalePrice(''); setCustomer(''); setPayment('cash')
    setSaleDate(new Date().toISOString().split('T')[0]); setNotes('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (insufficient) { showToast('Not enough stock for this sale.', false); return }
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.from('stock_movements').insert([{
        product_id: productId, movement_type: 'sale',
        qty_bags: parseFloat(qtyBags) || 0,
        qty_tonnes: parseFloat(qtyTonnes) || 0,
        qty_bundles: parseInt(qtyBundles) || 0,
        qty_lengths: parseInt(qtyLengths) || 0,
        unit_price: parseFloat(salePrice) || 0,
        total_value: total,
        customer_name: customer || null,
        payment_method: payment,
        delivery_date: saleDate, notes: notes || null, created_by: user.id,
      }])
      if (error) throw error

      showToast('Sale recorded — stock deducted and revenue updated.')
      resetForm()
      supabase.from('products').select('*').eq('is_active', true).order('category').order('name')
        .then(({ data }) => setProducts((data as Product[]) ?? []))
    } catch (err: any) {
      showToast(err.message ?? 'Failed to record sale.', false)
    } finally { setSubmitting(false) }
  }

  if (loading || !profile) return <div className="loading"><span className="spinner dark" /></div>

  return (
    <Layout profile={profile} onSignOut={signOut}>
      <div className="page">
        <div className="page-title">Record sale</div>
        <div className="page-sub">Deduct sold quantities from stock and log revenue</div>

        {toast.msg && <div className={`alert ${toast.ok ? 'success' : 'danger'}`} style={{ marginBottom: 20 }}>{toast.msg}</div>}

        <form onSubmit={handleSubmit} style={{ maxWidth: 600 }}>
          <div className="card">
            <div className="fgroup">
              <label className="flabel">Select product *</label>
              <select className="fselect" value={productId} onChange={e => setProductId(e.target.value)} required>
                <option value="">— Choose product —</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.category === 'cement' ? `${p.qty_bags} bags` : `${p.qty_bundles} bundles`} in stock
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--r-md)', padding: 12, marginBottom: 14, fontSize: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div><span style={{ color: 'var(--gray-500)' }}>In stock: </span>
                  <strong>{selectedProduct.category === 'cement' ? `${selectedProduct.qty_bags} bags` : `${selectedProduct.qty_bundles} bundles`}</strong>
                </div>
                <div><span style={{ color: 'var(--gray-500)' }}>Selling price: </span>
                  <strong>{formatNaira(selectedProduct.selling_price)}</strong>
                </div>
              </div>
            )}

            <div className="fsection">Quantities sold</div>
            {!selectedProduct || selectedProduct.category === 'cement' ? (
              <div className="fgrid">
                <div className="fgroup">
                  <label className="flabel">Bags sold *</label>
                  <input className="finput" type="number" min="0" value={qtyBags} onChange={e => setQtyBags(e.target.value)} placeholder="0" />
                  {insufficient && <span className="ferr">Exceeds available stock</span>}
                </div>
                <div className="fgroup">
                  <label className="flabel">Weight sold (tonnes)</label>
                  <input className="finput" type="number" min="0" step="0.01" value={qtyTonnes} onChange={e => setQtyTonnes(e.target.value)} placeholder="0.00" />
                </div>
              </div>
            ) : (
              <div className="fgrid">
                <div className="fgroup">
                  <label className="flabel">Bundles sold *</label>
                  <input className="finput" type="number" min="0" value={qtyBundles} onChange={e => setQtyBundles(e.target.value)} placeholder="0" />
                  {insufficient && <span className="ferr">Exceeds available stock</span>}
                </div>
                <div className="fgroup">
                  <label className="flabel">Lengths sold</label>
                  <input className="finput" type="number" min="0" value={qtyLengths} onChange={e => setQtyLengths(e.target.value)} placeholder="0" />
                </div>
              </div>
            )}

            <div className="fsection">Sale details</div>
            <div className="fgrid">
              <div className="fgroup">
                <label className="flabel">Sale price per unit (₦) *</label>
                <input className="finput" type="number" min="0" value={salePrice} onChange={e => setSalePrice(e.target.value)} required placeholder="0" />
              </div>
              <div className="fgroup">
                <label className="flabel">Total sale value</label>
                <div className="finput" style={{ background: 'var(--gray-50)', fontWeight: 600, color: 'var(--brand)' }}>
                  {formatNaira(total)}
                </div>
              </div>
              <div className="fgroup">
                <label className="flabel">Customer name (optional)</label>
                <input className="finput" value={customer} onChange={e => setCustomer(e.target.value)} placeholder="e.g. Alhaji Musa" />
              </div>
              <div className="fgroup">
                <label className="flabel">Payment method *</label>
                <select className="fselect" value={payment} onChange={e => setPayment(e.target.value)}>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="pos">POS</option>
                  <option value="credit">Credit</option>
                </select>
              </div>
              <div className="fgroup">
                <label className="flabel">Sale date *</label>
                <input className="finput" type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} required />
              </div>
            </div>
            <div className="fgroup">
              <label className="flabel">Notes (optional)</label>
              <input className="finput" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Customer to collect tomorrow" />
            </div>

            <button className="btn btn-primary btn-full" type="submit" disabled={submitting || !!insufficient}>
              {submitting ? <span className="spinner" /> : 'Record sale'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}
