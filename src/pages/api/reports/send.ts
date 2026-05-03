// src/pages/api/reports/send.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getAdminClient } from '../../../lib/supabase'
import { productValue, formatNaira, isLowStock, primaryQty, secondaryQty } from '../../../lib/utils'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false })

  try {
    const admin = getAdminClient()

    // Verify admin session from cookie
    const token = req.cookies['sb-access-token'] ?? req.headers.authorization?.replace('Bearer ', '')
    if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' })

    const { data: { user } } = await admin.auth.getUser(token)
    if (!user) return res.status(401).json({ ok: false, error: 'Unauthorized' })

    const { data: prof } = await admin.from('profiles').select('role, full_name').eq('id', user.id).single()
    if (!prof || (prof as any).role !== 'admin') return res.status(403).json({ ok: false, error: 'Admin only' })

    const [{ data: prods }, { data: biz }, { data: sched }] = await Promise.all([
      admin.from('products').select('*').eq('is_active', true).order('category').order('name'),
      admin.from('business_settings').select('business_name').limit(1).single(),
      admin.from('report_schedule').select('*').limit(1).single(),
    ])

    const products = prods ?? []
    const totalVal = products.reduce((s: number, p: any) => s + productValue(p), 0)
    const lowItems = products.filter((p: any) => isLowStock(p))
    const bizName = (biz as any)?.business_name ?? 'StockMaster Pro'
    const dateStr = new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })

    // Create in-app notification
    await admin.from('notifications').insert([{
      type: 'report_ready',
      title: `Biweekly stock report — ${dateStr}`,
      message: `Report for ${bizName}. ${products.length} products tracked. Total stock value: ${formatNaira(totalVal)}. ${lowItems.length > 0 ? `⚠ ${lowItems.length} low-stock item(s): ${lowItems.map((p: any) => p.name).join(', ')}.` : 'All stock levels OK.'}`,
      severity: lowItems.length > 0 ? 'warning' : 'success',
      triggered_by: user.id,
      metadata: {
        product_count: products.length,
        total_value: totalVal,
        low_stock_count: lowItems.length,
        generated_by: (prof as any).full_name,
        date: dateStr,
      }
    }])

    // Update schedule
    if (sched) {
      const next = new Date(Date.now() + ((sched as any).frequency_days ?? 14) * 86400000).toISOString()
      await admin.from('report_schedule').update({ last_sent_at: new Date().toISOString(), next_send_at: next }).eq('id', (sched as any).id)
    }

    // Try email if configured (non-fatal)
    if (process.env.SMTP_HOST && (sched as any)?.recipient_email) {
      try {
        const nodemailer = require('nodemailer')
        const t = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: 587, secure: false, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } })
        const rows = products.map((p: any) => `<tr><td style="padding:7px 8px;border-bottom:1px solid #9FE1CB;color:#085041">${p.name}</td><td style="padding:7px 8px;border-bottom:1px solid #9FE1CB;color:#085041">${primaryQty(p)}</td><td style="padding:7px 8px;border-bottom:1px solid #9FE1CB;color:#085041">${secondaryQty(p)}</td><td style="padding:7px 8px;border-bottom:1px solid #9FE1CB;color:${isLowStock(p) ? '#A32D2D' : '#3B6D11'};font-weight:600">${isLowStock(p) ? 'Low stock' : 'OK'}</td></tr>`).join('')
        await t.sendMail({
          from: `${bizName} <${process.env.SMTP_USER}>`,
          to: (sched as any).recipient_email,
          subject: `${bizName} — Stock Report (${dateStr})`,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px"><div style="background:#1D9E75;border-radius:8px;padding:20px;text-align:center;margin-bottom:20px"><h2 style="color:white;margin:0">${bizName}</h2><p style="color:#9FE1CB;margin:4px 0 0">Stock Report — ${dateStr}</p></div><p style="font-size:14px;margin-bottom:12px"><strong>Total value:</strong> ${formatNaira(totalVal)} &nbsp;|&nbsp; <strong>Low-stock alerts:</strong> ${lowItems.length}</p><table style="width:100%;border-collapse:collapse;background:#E1F5EE;border-radius:8px"><thead><tr style="background:#1D9E75"><th style="padding:9px 8px;text-align:left;color:white;font-size:12px">Product</th><th style="padding:9px 8px;text-align:left;color:white;font-size:12px">Primary qty</th><th style="padding:9px 8px;text-align:left;color:white;font-size:12px">Secondary qty</th><th style="padding:9px 8px;text-align:left;color:white;font-size:12px">Status</th></tr></thead><tbody>${rows}</tbody></table></div>`,
        })
      } catch (emailErr) { console.warn('Email failed (non-fatal):', emailErr) }
    }

    return res.json({ ok: true })
  } catch (err: any) {
    console.error('Report error:', err)
    return res.status(500).json({ ok: false, error: err.message ?? 'Failed' })
  }
}
