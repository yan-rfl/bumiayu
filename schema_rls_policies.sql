-- ====================================================================
-- KEBIJAKAN KEAMANAN ROW LEVEL SECURITY (RLS) - BUMIAYU DISTRIBUTOR
-- Jalankan file ini di Supabase SQL Editor untuk memberikan izin akses
-- yang tepat kepada Sales dan Owner.
-- ====================================================================

-- 1. PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read profiles" ON profiles;
CREATE POLICY "Authenticated can read profiles" ON profiles
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 2. STORES (Pelanggan / Toko)
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read stores" ON stores;
CREATE POLICY "Authenticated can read stores" ON stores
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Owner can manage stores" ON stores;
CREATE POLICY "Owner can manage stores" ON stores
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'owner')
    );

-- 3. PRODUCTS & UNITS (Master Produk & Multi Satuan)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read products" ON products;
CREATE POLICY "Authenticated can read products" ON products
    FOR SELECT TO authenticated USING (true);

ALTER TABLE product_units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read product_units" ON product_units;
CREATE POLICY "Authenticated can read product_units" ON product_units
    FOR SELECT TO authenticated USING (true);

ALTER TABLE inventory_stocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read inventory_stocks" ON inventory_stocks;
CREATE POLICY "Authenticated can read inventory_stocks" ON inventory_stocks
    FOR SELECT TO authenticated USING (true);

ALTER TABLE inventory_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read inventory_snapshots" ON inventory_snapshots;
CREATE POLICY "Authenticated can read inventory_snapshots" ON inventory_snapshots
    FOR SELECT TO authenticated USING (true);

-- 4. SALES ORDERS & ITEMS (Pemesanan Sales)
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read sales_orders" ON sales_orders;
CREATE POLICY "Authenticated can read sales_orders" ON sales_orders
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Sales can insert sales_orders" ON sales_orders;
CREATE POLICY "Sales can insert sales_orders" ON sales_orders
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = sales_id);

DROP POLICY IF EXISTS "Owner can update sales_orders" ON sales_orders;
CREATE POLICY "Owner can update sales_orders" ON sales_orders
    FOR UPDATE TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'owner')
    );

ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read sales_order_items" ON sales_order_items;
CREATE POLICY "Authenticated can read sales_order_items" ON sales_order_items
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert sales_order_items" ON sales_order_items;
CREATE POLICY "Authenticated can insert sales_order_items" ON sales_order_items
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Owner can update sales_order_items" ON sales_order_items;
CREATE POLICY "Owner can update sales_order_items" ON sales_order_items
    FOR UPDATE TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'owner')
    );

-- 5. BEAT ROUTE (Jadwal Rute)
ALTER TABLE beat_route_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read beat_route_schedules" ON beat_route_schedules;
CREATE POLICY "Authenticated can read beat_route_schedules" ON beat_route_schedules
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Owner can manage beat_route_schedules" ON beat_route_schedules;
CREATE POLICY "Owner can manage beat_route_schedules" ON beat_route_schedules
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'owner')
    );

-- 6. SALES INVOICES & PAYMENTS (Faktur & Pembayaran)
ALTER TABLE sales_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read sales_invoices" ON sales_invoices;
CREATE POLICY "Authenticated can read sales_invoices" ON sales_invoices
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Owner can manage sales_invoices" ON sales_invoices;
CREATE POLICY "Owner can manage sales_invoices" ON sales_invoices
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'owner')
    );

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read payments" ON payments;
CREATE POLICY "Authenticated can read payments" ON payments
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert payments" ON payments;
CREATE POLICY "Authenticated can insert payments" ON payments
    FOR INSERT TO authenticated WITH CHECK (true);

-- 7. EXPENSES & AUDIT TRAILS
ALTER TABLE operational_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read expenses" ON operational_expenses;
CREATE POLICY "Authenticated can read expenses" ON operational_expenses
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert expenses" ON operational_expenses;
CREATE POLICY "Authenticated can insert expenses" ON operational_expenses
    FOR INSERT TO authenticated WITH CHECK (true);

ALTER TABLE audit_trails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read audit_trails" ON audit_trails;
CREATE POLICY "Authenticated can read audit_trails" ON audit_trails
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert audit_trails" ON audit_trails;
CREATE POLICY "Authenticated can insert audit_trails" ON audit_trails
    FOR INSERT TO authenticated WITH CHECK (true);
