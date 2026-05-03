-- StockMaster Pro — Database Schema
-- Run this ENTIRE file in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','staff')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business settings
CREATE TABLE business_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name TEXT NOT NULL DEFAULT 'My Business Name',
  branch TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO business_settings (business_name) VALUES ('My Business Name');

-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('cement','rod')),
  supplier TEXT,
  qty_bags NUMERIC(10,2) DEFAULT 0,
  qty_tonnes NUMERIC(10,4) DEFAULT 0,
  qty_bundles INTEGER DEFAULT 0,
  qty_lengths INTEGER DEFAULT 0,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(12,2) DEFAULT 0,
  threshold_bags NUMERIC(10,2) DEFAULT 100,
  threshold_tonnes NUMERIC(10,4) DEFAULT 5,
  threshold_bundles INTEGER DEFAULT 20,
  threshold_lengths INTEGER DEFAULT 120,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock movements
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('stock_in','sale','adjustment')),
  qty_bags NUMERIC(10,2) DEFAULT 0,
  qty_tonnes NUMERIC(10,4) DEFAULT 0,
  qty_bundles INTEGER DEFAULT 0,
  qty_lengths INTEGER DEFAULT 0,
  unit_price NUMERIC(12,2),
  total_value NUMERIC(14,2),
  customer_name TEXT,
  payment_method TEXT CHECK (payment_method IN ('cash','bank_transfer','pos','credit')),
  supplier TEXT,
  waybill_no TEXT,
  delivery_date DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications (admin only)
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('low_stock','stock_in','sale','report_ready','system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  triggered_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info','warning','critical','success')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  user_name TEXT,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Report schedule
CREATE TABLE report_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  frequency_days INTEGER DEFAULT 14,
  last_sent_at TIMESTAMPTZ,
  next_send_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  recipient_email TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO report_schedule (recipient_email) VALUES ('admin@yourbusiness.ng');

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prod_upd BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_prof_upd BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Apply stock movements to product quantities
CREATE OR REPLACE FUNCTION apply_movement() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.movement_type = 'stock_in' THEN
    UPDATE products SET qty_bags=qty_bags+NEW.qty_bags, qty_tonnes=qty_tonnes+NEW.qty_tonnes, qty_bundles=qty_bundles+NEW.qty_bundles, qty_lengths=qty_lengths+NEW.qty_lengths WHERE id=NEW.product_id;
  ELSIF NEW.movement_type = 'sale' THEN
    UPDATE products SET qty_bags=qty_bags-NEW.qty_bags, qty_tonnes=qty_tonnes-NEW.qty_tonnes, qty_bundles=qty_bundles-NEW.qty_bundles, qty_lengths=qty_lengths-NEW.qty_lengths WHERE id=NEW.product_id;
  ELSIF NEW.movement_type = 'adjustment' THEN
    UPDATE products SET qty_bags=qty_bags+NEW.qty_bags, qty_tonnes=qty_tonnes+NEW.qty_tonnes, qty_bundles=qty_bundles+NEW.qty_bundles, qty_lengths=qty_lengths+NEW.qty_lengths WHERE id=NEW.product_id;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_movement AFTER INSERT ON stock_movements FOR EACH ROW EXECUTE FUNCTION apply_movement();

-- Auto-create notifications on stock movements
CREATE OR REPLACE FUNCTION notify_movement() RETURNS TRIGGER AS $$
DECLARE p RECORD;
BEGIN
  SELECT * INTO p FROM products WHERE id = NEW.product_id;
  IF NEW.movement_type = 'stock_in' THEN
    INSERT INTO notifications (type,title,message,product_id,triggered_by,severity,metadata)
    VALUES ('stock_in','Stock received — '||p.name,'New delivery recorded for '||p.name||COALESCE('. Supplier: '||NEW.supplier,''),'.',p.id,NEW.created_by,'success',jsonb_build_object('qty_bags',NEW.qty_bags,'qty_bundles',NEW.qty_bundles,'waybill',NEW.waybill_no));
  END IF;
  IF NEW.movement_type = 'sale' THEN
    INSERT INTO notifications (type,title,message,product_id,triggered_by,severity,metadata)
    VALUES ('sale','Sale recorded — '||p.name,'Sale of '||p.name||COALESCE(' to '||NEW.customer_name,'')
    ||'. Payment: '||COALESCE(NEW.payment_method,'—')||'.',p.id,NEW.created_by,'info',jsonb_build_object('total_value',NEW.total_value,'customer',NEW.customer_name));
  END IF;
  IF p.category = 'cement' AND p.qty_bags < p.threshold_bags THEN
    INSERT INTO notifications (type,title,message,product_id,severity,metadata)
    VALUES ('low_stock','Low stock — '||p.name,p.name||' has '||p.qty_bags||' bags remaining (threshold: '||p.threshold_bags||' bags).',p.id,'critical',jsonb_build_object('qty_bags',p.qty_bags,'threshold',p.threshold_bags));
  END IF;
  IF p.category = 'rod' AND p.qty_bundles < p.threshold_bundles THEN
    INSERT INTO notifications (type,title,message,product_id,severity,metadata)
    VALUES ('low_stock','Low stock — '||p.name,p.name||' has '||p.qty_bundles||' bundles remaining (threshold: '||p.threshold_bundles||' bundles).',p.id,'critical',jsonb_build_object('qty_bundles',p.qty_bundles,'threshold',p.threshold_bundles));
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_notify AFTER INSERT ON stock_movements FOR EACH ROW EXECUTE FUNCTION notify_movement();

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_admin" ON profiles FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin'));
CREATE POLICY "products_read" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products_write" ON products FOR ALL TO authenticated USING (true);
CREATE POLICY "movements_read" ON stock_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "movements_insert" ON stock_movements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notifs_admin" ON notifications FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin'));
CREATE POLICY "notifs_insert" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "audit_insert" ON audit_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "audit_admin" ON audit_log FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin'));
CREATE POLICY "report_admin" ON report_schedule FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin'));
CREATE POLICY "biz_read" ON business_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "biz_admin" ON business_settings FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin'));

-- Seed products
INSERT INTO products (name,sku,category,qty_bags,qty_tonnes,threshold_bags,threshold_tonnes,unit_price,selling_price,supplier)
VALUES
  ('Cement — Dangote 42.5R','CEM-001','cement',320,16,100,5,5800,6200,'Dangote Cement PLC'),
  ('Cement — BUA Premium','CEM-002','cement',85,4.25,100,5,5600,6000,'BUA Cement');

INSERT INTO products (name,sku,category,qty_bundles,qty_lengths,threshold_bundles,threshold_lengths,unit_price,selling_price,supplier)
VALUES
  ('Iron rod 10mm','ROD-010','rod',42,252,20,120,48000,52000,'Steel Masters Ltd'),
  ('Iron rod 12mm','ROD-012','rod',18,108,20,120,56000,60000,'Steel Masters Ltd'),
  ('Iron rod 16mm','ROD-016','rod',9,54,15,90,72000,77000,'Kano Iron Works'),
  ('Iron rod 20mm','ROD-020','rod',5,30,10,60,92000,98000,'Kano Iron Works');

-- Seed sample notifications
INSERT INTO notifications (type,title,message,severity) VALUES
  ('low_stock','Low stock — Cement BUA Premium','BUA Premium has 85 bags remaining (threshold: 100 bags).','critical'),
  ('low_stock','Low stock — Iron rod 20mm','Iron rod 20mm has 5 bundles remaining (threshold: 10 bundles).','critical'),
  ('system','Welcome to StockMaster Pro','Your inventory system is ready. Start by setting your business name in Settings.','info');
