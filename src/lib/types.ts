// src/lib/types.ts

export type Role = 'admin' | 'staff'
export type Category = 'cement' | 'rod'
export type MovementType = 'stock_in' | 'sale' | 'adjustment'
export type PaymentMethod = 'cash' | 'bank_transfer' | 'pos' | 'credit'
export type Severity = 'info' | 'warning' | 'critical' | 'success'
export type NotifType = 'low_stock' | 'stock_in' | 'sale' | 'report_ready' | 'system'

export interface Profile {
  id: string
  full_name: string
  role: Role
  is_active: boolean
  created_at: string
}

export interface Product {
  id: string
  name: string
  sku: string
  category: Category
  supplier: string | null
  qty_bags: number
  qty_tonnes: number
  qty_bundles: number
  qty_lengths: number
  unit_price: number
  selling_price: number
  threshold_bags: number
  threshold_tonnes: number
  threshold_bundles: number
  threshold_lengths: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Movement {
  id: string
  product_id: string
  movement_type: MovementType
  qty_bags: number
  qty_tonnes: number
  qty_bundles: number
  qty_lengths: number
  unit_price: number | null
  total_value: number | null
  customer_name: string | null
  payment_method: PaymentMethod | null
  supplier: string | null
  waybill_no: string | null
  delivery_date: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  product_name?: string
}

export interface Notification {
  id: string
  type: NotifType
  title: string
  message: string
  product_id: string | null
  is_read: boolean
  read_at: string | null
  severity: Severity
  metadata: Record<string, unknown>
  created_at: string
}

export interface BusinessSettings {
  id: string
  business_name: string
  branch: string
}

export interface ReportSchedule {
  id: string
  frequency_days: number
  last_sent_at: string | null
  next_send_at: string
  recipient_email: string
}
