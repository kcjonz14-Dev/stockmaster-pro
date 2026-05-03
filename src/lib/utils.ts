// src/lib/utils.ts
import type { Product } from './types'

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 0
  }).format(amount)
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-NG', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  })
}

export function primaryQty(p: Product): string {
  return p.category === 'cement' ? `${p.qty_bags} bags` : `${p.qty_bundles} bundles`
}

export function secondaryQty(p: Product): string {
  return p.category === 'cement' ? `${p.qty_tonnes}t` : `${p.qty_lengths} lengths`
}

export function isLowStock(p: Product): boolean {
  return p.category === 'cement'
    ? p.qty_bags < p.threshold_bags
    : p.qty_bundles < p.threshold_bundles
}

export function stockStatus(p: Product): 'ok' | 'warning' | 'critical' {
  const qty = p.category === 'cement' ? p.qty_bags : p.qty_bundles
  const t = p.category === 'cement' ? p.threshold_bags : p.threshold_bundles
  if (qty < t) return 'critical'
  if (qty < t * 1.5) return 'warning'
  return 'ok'
}

export function productValue(p: Product): number {
  return p.category === 'cement'
    ? p.qty_bags * p.unit_price
    : p.qty_bundles * p.unit_price
}

export function barPercent(p: Product): number {
  const qty = p.category === 'cement' ? p.qty_bags : p.qty_bundles
  const t = p.category === 'cement' ? p.threshold_bags : p.threshold_bundles
  return Math.min(100, Math.round((qty / Math.max(t * 2, qty, 1)) * 100))
}

export function barColor(p: Product): string {
  const s = stockStatus(p)
  return s === 'critical' ? '#E24B4A' : s === 'warning' ? '#EF9F27' : '#1D9E75'
}
