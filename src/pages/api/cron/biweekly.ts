// src/pages/api/cron/biweekly.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getAdminClient } from '../../../lib/supabase'
import { productValue, formatNaira, isLowStock } from '../../../lib/utils'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const secret = req.headers['x-cron-secret'] ?? req.query.secret
  if (secret !== process.env.CRON_SECRET) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const admin = getAdminClient()
    const { data: sched } = await admin.from('report_schedule').select('*').eq('is_active', true).limit(1).single()
    if (!sched) return res.json({ skipped: 'No schedule found.' })

    if (new Date() < new Date((sched as any).next_send_at)) {
      return res.json({ skipped: true, next: (sched as any).next_send_at })
    }

    const [{ data: prods }, { data: biz }] = await Promise.all([
      admin.from('products').select('*').eq('is_active', true),
      admin.from('business_settings').select('business_name').limit(1).single(),
    ])

    const products = prods ?? []
    const totalVal = products.reduce((s: number, p: any) => s + productValue(p), 0)
    const lowItems = products.filter((p: any) => isLowStock(p))
    const bizName = (biz as any)?.business_name ?? 'StockMaster Pro'
    const dateStr = new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })

    await admin.from('notifications').insert([{
      type: 'report_ready',
      title: `Biweekly stock report — ${dateStr}`,
      message: `Scheduled report for ${bizName}. ${products.length} products. Total: ${formatNaira(totalVal)}. ${lowItems.length > 0 ? `⚠ ${lowItems.length} low-stock items.` : 'All levels OK.'}`,
      severity: lowItems.length > 0 ? 'warning' : 'success',
      metadata: { product_count: products.length, total_value: totalVal, low_stock_count: lowItems.length, triggered: 'cron' }
    }])

    const next = new Date(Date.now() + ((sched as any).frequency_days ?? 14) * 86400000).toISOString()
    await admin.from('report_schedule').update({ last_sent_at: new Date().toISOString(), next_send_at: next }).eq('id', (sched as any).id)

    return res.json({ sent: true, next })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
