// src/pages/add-stock.tsx
import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/useAuth'
import { supabase } from '../lib/supabase'
import type { Product } from '../lib/types'

export default function AddStockPage() {
  const { profile, loading, signOut } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [isNew, setIsNew] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState({ msg: '', ok: true })

  // Form state
  const [productId, setProductId] = useState('')
  const [newName, setNewName] = useState('')
  const [newSku, setNewSku] = useState('')
  const [newCategory, setNewCategory] = useState<'cement' | 'rod'>('cement')
  const [newSupplier, setNewSupplier] = useState('')
  const [newUnitPrice, setNewUnitPrice] = useState('')
  const [newSellingPrice, setNewSellingPrice] = useState('')
  const [qtyBags, setQtyBags] = useState('')
  const [qtyTonnes, setQtyTonnes] = useState('')
  const [qtyBundles, setQtyBundles] = useState('')
  const [qtyLengths, setQtyLengths] = useState('')
  const [supplier, setSupplier] = useState('')
  const [waybill, setWaybill] = useState('')
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')

  const selectedProduct = products.find(p => p.id === productId)
  const category = isNew ? newCategory : (selectedProduct?.category ?? 'cement')

  useEffect(() => {
    if (!profile) return
    supabase.from('products').select('*').eq('is_active', true).order('name')
      .then(({ data }) => setProducts((data as Product[]) ?? []))
  }, [profile])

  function showToast(msg: string, ok = true) { setToast({ msg, ok }); setTimeout(() => setToast({ msg: '', ok: true }), 4000) }

  function resetForm() {
    setProductId(''); setNewName(''); setNewSku(''); setNewSupplier('')
    setNewUnitPrice(''); setNewSellingPrice(''); setQtyBags(''); setQtyTonnes('')
    setQtyBundles(''); setQtyLengths(''); setSupplier(''); setWaybill('')
    setDeliveryDate(new Date().toISOString().split('T')[0]); setNotes('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let pid = productId

      if (isNew) {
        const { data: newProd, error } = await supabase.from('products').insert([{
          name: newName, sku: newSku, category: newCategory,
          supplier: newSupplier || null,
          unit_price: parseFloat(newUnitPrice) || 0,
          selling_price: parseFloat(newSellingPrice) || 0,
          qty_bags: 0, qty_tonnes: 0, qty_bundles: 0, qty_lengths: 0,
          threshold_bags: 100, threshold_tonnes: 5, threshold_bundles: 20, threshold_lengths: 120,
          is_active: true, created_by: user.id,
        }]).select().single()
        if (error) throw error
        pid = (newProd as any).id
      }

      const { error: mvErr } = await supabase.from('stock_movements').insert([{
        product_id: pid, movement_type: 'stock_in',
        qty_bags: parseFloat(qtyBags) || 0,
        qty_tonnes: parseFloat(qtyTonnes) || 0,
        qty_bundles: parseInt(qtyBundles) || 0,
        qty_lengths: parseInt(qtyLengths) || 0,
        supplier: supplier || null, waybill_no: waybill || null,
        delivery_date: deliveryDate, notes: notes || null, created_by: user.id,
      }])
      if (mvErr) throw mvErr

      showToast('Stock added successfully — inventory updated.')
      resetForm()
      supabase.from('products').select('*').eq('is_active', true).order('name')
        .then(({ data }) => setProducts((data as Product[]) ?? []))
    } catch (err: any) {
      showToast(err.message ?? 'Failed to add stock.', false)
    } finally { setSubmitting(false) }
  }

  if (loading || !profile) return <div className="loading"><span className="spinner dark" /></div>

  return (
    <Layout profile={profile} onSignOut={signOut}>
      <div className="page">
        <div className="page-title">Add new stock</div>
        <div className="page-sub">Record incoming delivery — enter both primary and secondary quantities</div>

        {toast.msg && <div className={`alert ${toast.ok ? 'success' : 'danger'}`} style={{ marginBottom: 20 }}>{toast.msg}</div>}

        <form onSubmit={handleSubmit} style={{ maxWidth: 600 }}>
          <div className="card">
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <button type="button" className={`btn ${!isNew ? 'btn-primary' : ''}`} onClick={() => setIsNew(false)}>Existing product</button>
              <button type="button" className={`btn ${isNew ? 'btn-primary' : ''}`} onClick={() => setIsNew(true)}>New product</button>
            </div>

            {!isNew ? (
              <div className="fgroup">
                <label className="flabel">Select product *</label>
                <select className="fselect" value={productId} onChange={e => setProductId(e.target.value)} required>
                  <option value="">— Choose product —</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
              </div>
            ) : (
              <>
                <div className="fsection">New product details</div>
                <div className="fgrid">
                  <div className="fgroup">
                    <label className="flabel">Product name *</label>
                    <input className="finput" value={newName} onChange={e => setNewName(e.target.value)} required placeholder="e.g. Cement — Lafarge" />
                  </div>
                  <div className="fgroup">
                    <label className="flabel">SKU / Product code *</label>
                    <input className="finput" value={newSku} onChange={e => setNewSku(e.target.value)} required placeholder="e.g. CEM-003" />
                  </div>
                  <div className="fgroup">
                    <label className="flabel">Category *</label>
                    <select className="fselect" value={newCategory} onChange={e => setNewCategory(e.target.value as 'cement' | 'rod')}>
                      <option value="cement">Cement</option>
                      <option value="rod">Iron rod</option>
                    </select>
                  </div>
                  <div className="fgroup">
                    <label className="flabel">Supplier</label>
                    <input className="finput" value={newSupplier} onChange={e => setNewSupplier(e.target.value)} placeholder="e.g. Dangote Cement PLC" />
                  </div>
                  <div className="fgroup">
                    <label className="flabel">Unit price (₦)</label>
                    <input className="finput" type="number" min="0" value={newUnitPrice} onChange={e => setNewUnitPrice(e.target.value)} placeholder="0" />
                  </div>
                  <div className="fgroup">
                    <label className="flabel">Selling price (₦)</label>
                    <input className="finput" type="number" min="0" value={newSellingPrice} onChange={e => setNewSellingPrice(e.target.value)} placeholder="0" />
                  </div>
                </div>
              </>
            )}

            <div className="fsection">Quantity received — enter both units</div>
            {category === 'cement' ? (
              <div className="fgrid">
                <div className="fgroup">
                  <label className="flabel">Bags received</label>
                  <input className="finput" type="number" min="0" value={qtyBags} onChange={e => setQtyBags(e.target.value)} placeholder="0" />
                </div>
                <div className="fgroup">
                  <label className="flabel">Weight (tonnes)</label>
                  <input className="finput" type="number" min="0" step="0.01" value={qtyTonnes} onChange={e => setQtyTonnes(e.target.value)} placeholder="0.00" />
                </div>
              </div>
            ) : (
              <div className="fgrid">
                <div className="fgroup">
                  <label className="flabel">Bundles received</label>
                  <input className="finput" type="number" min="0" value={qtyBundles} onChange={e => setQtyBundles(e.target.value)} placeholder="0" />
                </div>
                <div className="fgroup">
                  <label className="flabel">Lengths received</label>
                  <input className="finput" type="number" min="0" value={qtyLengths} onChange={e => setQtyLengths(e.target.value)} placeholder="0" />
                </div>
              </div>
            )}

            <div className="fsection">Delivery details</div>
            <div className="fgrid">
              <div className="fgroup">
                <label className="flabel">Supplier</label>
                <input className="finput" value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="e.g. Dangote Cement PLC" />
              </div>
              <div className="fgroup">
                <label className="flabel">Waybill / Invoice no.</label>
                <input className="finput" value={waybill} onChange={e => setWaybill(e.target.value)} placeholder="e.g. WB-001" />
              </div>
              <div className="fgroup">
                <label className="flabel">Delivery date *</label>
                <input className="finput" type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} required />
              </div>
            </div>
            <div className="fgroup">
              <label className="flabel">Notes (optional)</label>
              <input className="finput" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Delivered in good condition" />
            </div>

            <button className="btn btn-primary btn-full" type="submit" disabled={submitting}>
              {submitting ? <span className="spinner" /> : 'Confirm stock addition'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}
