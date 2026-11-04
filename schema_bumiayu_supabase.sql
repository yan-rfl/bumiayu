-- ====================================================================
-- SKEMA DATABASE BUMIAYU DISTRIBUTOR (SUPABASE / POSTGRESQL) - REVISI LENGKAP
-- Berdasarkan Dokumen Spesifikasi Kebutuhan Sistem: 'Fitur BumiAyu.xlsx'
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUM TYPES
CREATE TYPE user_role AS ENUM ('owner', 'sales');
CREATE TYPE order_status AS ENUM ('DRAFT', 'PENDING_PAYMENT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE invoice_payment_status AS ENUM ('BELUM_LUNAS', 'SEBAGIAN', 'LUNAS');
CREATE TYPE payment_method AS ENUM ('TUNAI', 'TRANSFER', 'GIRO');
CREATE TYPE top_type AS ENUM ('0_HARI', '7_HARI', '14_HARI');
CREATE TYPE expense_category AS ENUM ('BBM', 'PARKIR_RETRIBUSI', 'REPARASI_ARMADA', 'GAJI_BONUS', 'OPERASIONAL_LAINNYA');
CREATE TYPE audit_action AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'PRINT', 'SETTLEMENT', 'STOCK_REFRESH');

-- ====================================================================
-- 3. PROFIL PENGGUNA (PROFILES)
-- Login murni Username + Password (dipetakan ke username@bumiayu.internal)
-- ====================================================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role user_role NOT NULL DEFAULT 'sales',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- 4. MASTER PELANGGAN / TOKO (STORES)
-- Plafon hutang custom per request & TOP 0/7/14 hari
-- ====================================================================
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(30) UNIQUE NOT NULL, -- Contoh: TK-001
    name VARCHAR(120) NOT NULL,
    owner_name VARCHAR(100),
    phone_wa VARCHAR(25) NOT NULL,
    address TEXT NOT NULL,
    zone_code VARCHAR(30) NOT NULL, -- Kode Wilayah (cth: WIL-PASAR-LEGI, Z-01)
    top_days INT NOT NULL DEFAULT 0, -- 0 (Cash saat kirim), 7, atau 14 hari
    credit_limit DECIMAL(15, 2) NOT NULL DEFAULT 0, -- Plafon custom (0 = wajib tunai/0-day)
    current_debt DECIMAL(15, 2) NOT NULL DEFAULT 0, -- Total piutang berjalan
    is_locked BOOLEAN NOT NULL DEFAULT false, -- Terkunci jika over limit / lewat jatuh tempo
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- 5. DYNAMIC BEAT ROUTE (JADWAL RUTE 7 HARI KE DEPAN)
-- Ditentukan Admin setiap hari Minggu untuk 7 hari ke depan
-- 1 hari bisa memiliki >1 kode wilayah sejalur
-- ====================================================================
CREATE TABLE beat_route_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_date DATE NOT NULL,
    sales_id UUID NOT NULL REFERENCES profiles(id),
    zone_codes TEXT[] NOT NULL, -- Array kode wilayah, contoh: ARRAY['WIL-01', 'WIL-02']
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_sales_schedule_date UNIQUE (schedule_date, sales_id)
);

-- ====================================================================
-- 6. MASTER BARANG & MULTI SATUAN (PRODUCTS & UNITS)
-- Satuan bertingkat: PCS, BD (Bendit = isi 3 pcs), KTN (Karton = variatif)
-- ====================================================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(50) UNIQUE NOT NULL, -- Kode SKU
    name VARCHAR(150) NOT NULL, -- Contoh: Charm Safe Night 35cm
    category VARCHAR(50) DEFAULT 'Charm',
    base_unit VARCHAR(10) NOT NULL DEFAULT 'PCS', -- Satuan dasar terendah
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel Satuan Bertingkat (PCS, BD, KTN)
CREATE TABLE product_units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    unit_name VARCHAR(10) NOT NULL, -- 'PCS', 'BD', 'KTN'
    conversion_qty INT NOT NULL, -- Rasio ke PCS: PCS=1, BD=3, KTN=24 (atau sesuai SKU)
    purchase_price DECIMAL(15, 2) NOT NULL DEFAULT 0, -- HPP modal (untuk laba/rugi bersih)
    price_grosir DECIMAL(15, 2) NOT NULL DEFAULT 0, -- Harga jual grosir
    price_ecer DECIMAL(15, 2) NOT NULL DEFAULT 0, -- Harga jual ecer
    is_default_sales BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_product_unit UNIQUE (product_id, unit_name)
);

-- Stok Fisik Terkini (Hanya berkurang setelah Owner Approve Order)
CREATE TABLE inventory_stocks (
    product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    stock_base_unit INT NOT NULL DEFAULT 0, -- Total fisik dalam PCS
    minimum_stock_alert INT NOT NULL DEFAULT 60,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Snapshot Stok H-1 (Yang dilihat sales di HP untuk rekomendasi barang pengganti)
CREATE TABLE inventory_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_date DATE NOT NULL, -- Tanggal snapshot (H-1)
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    stock_base_unit INT NOT NULL DEFAULT 0,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_manual_refresh BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT unique_snapshot_product_date UNIQUE (snapshot_date, product_id)
);

-- ====================================================================
-- 7. SALES ORDERS (PRE-ORDER H+1 / H+2 DARI HP SALES)
-- ====================================================================
CREATE TABLE sales_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_no VARCHAR(50) UNIQUE NOT NULL, -- Format: SO-YYYYMMDD-XXXX
    store_id UUID NOT NULL REFERENCES stores(id),
    sales_id UUID NOT NULL REFERENCES profiles(id),
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    delivery_date DATE NOT NULL, -- Minimal H+1 atau H+2
    status order_status NOT NULL DEFAULT 'SUBMITTED',
    hold_reason TEXT, -- Alasan jika PENDING_PAYMENT (cth: 'Ada nota INV-001 belum lunas')
    bypass_token VARCHAR(50), -- Diisi Admin jika diberikan izin khusus
    subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
    grand_total DECIMAL(15, 2) NOT NULL DEFAULT 0,
    is_edited_by_admin BOOLEAN NOT NULL DEFAULT false, -- True jika Admin edit kuantitas stok riil
    admin_notes TEXT,
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rincian Item Pesanan
CREATE TABLE sales_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    product_unit_id UUID NOT NULL REFERENCES product_units(id),
    unit_name VARCHAR(10) NOT NULL, -- 'PCS', 'BD', 'KTN'
    quantity INT NOT NULL, -- Kuantitas dalam satuan yang dipilih
    original_quantity INT, -- Jika Admin mengedit qty, nilai awal disimpan di sini
    conversion_qty INT NOT NULL, -- Rasio konversi saat order
    unit_price DECIMAL(15, 2) NOT NULL,
    total_price DECIMAL(15, 2) NOT NULL
);

-- ====================================================================
-- 8. FAKTUR PENJUALAN & CETAK CONTINUOUS FORM 3-PLY
-- Terbit otomatis saat Admin menekan 'Approve' pada Sales Order
-- ====================================================================
CREATE TABLE sales_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_no VARCHAR(50) UNIQUE NOT NULL, -- Format: INV-YYYYMMDD-XXXX
    sales_order_id UUID UNIQUE NOT NULL REFERENCES sales_orders(id),
    store_id UUID NOT NULL REFERENCES stores(id),
    sales_id UUID NOT NULL REFERENCES profiles(id),
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL, -- Berdasarkan TOP toko (0 hari, 7 hari, 14 hari)
    total_amount DECIMAL(15, 2) NOT NULL,
    paid_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    remaining_balance DECIMAL(15, 2) NOT NULL,
    payment_status invoice_payment_status NOT NULL DEFAULT 'BELUM_LUNAS',
    printed_count INT NOT NULL DEFAULT 0, -- Counter cetak continuous form
    last_printed_at TIMESTAMP WITH TIME ZONE,
    last_printed_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- 9. SETTLEMENT & VERIFIKASI PEMBAYARAN OLEH ADMIN
-- ====================================================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_no VARCHAR(50) UNIQUE NOT NULL, -- Format: PAY-YYYYMMDD-XXXX
    invoice_id UUID NOT NULL REFERENCES sales_invoices(id),
    store_id UUID NOT NULL REFERENCES stores(id),
    amount DECIMAL(15, 2) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method payment_method NOT NULL DEFAULT 'TUNAI',
    verified_by UUID NOT NULL REFERENCES profiles(id), -- Admin yang mensahkan
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- 10. REKAP MUATAN GUDANG 24 JAM (CONSOLIDATED PICKING SHEET)
-- Digenerate setiap 24 jam sekali di jam tertentu
-- ====================================================================
CREATE TABLE consolidated_picking_recap (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recap_no VARCHAR(50) UNIQUE NOT NULL, -- Format: RECAP-YYYYMMDD-XX
    recap_date DATE NOT NULL DEFAULT CURRENT_DATE,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    generated_by UUID NOT NULL REFERENCES profiles(id),
    total_invoices_count INT NOT NULL DEFAULT 0,
    recap_summary JSONB NOT NULL, -- Format: [{"sku": "CHR-01", "name": "...", "total_ktn": 10, "total_bd": 5, "total_pcs": 2}]
    notes TEXT
);

-- ====================================================================
-- 11. BIAYA OPERASIONAL & PERHITUNGAN PROFIT BERSIH
-- ====================================================================
CREATE TABLE operational_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_no VARCHAR(50) UNIQUE NOT NULL, -- Format: EXP-YYYYMMDD-XXXX
    category expense_category NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    claimed_by UUID NOT NULL REFERENCES profiles(id), -- Sales atau Admin
    is_verified BOOLEAN NOT NULL DEFAULT true,
    verified_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- 12. AUDIT TRAIL LOG KOMPREHENSIF (CORE SECURITY & TRANSPARENCY)
-- Merekam seluruh aktivitas C/U/D/Approve/Print
-- ====================================================================
CREATE TABLE audit_trails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    action_type audit_action NOT NULL,
    module VARCHAR(50) NOT NULL, -- 'MASTER_DATA', 'SALES_ORDER', 'INVOICE', 'INVENTORY', 'EXPENSE', 'BEAT_ROUTE'
    record_id VARCHAR(50), -- ID / No Dokumen yang dimodifikasi
    old_value JSONB, -- Nilai sebelum perubahan
    new_value JSONB, -- Nilai setelah perubahan
    notes TEXT
);

-- ====================================================================
-- 13. INDEXES UNTUK KECEPATAN QUERY
-- ====================================================================
CREATE INDEX idx_stores_zone_code ON stores(zone_code);
CREATE INDEX idx_beat_route_date_sales ON beat_route_schedules(schedule_date, sales_id);
CREATE INDEX idx_sales_orders_status ON sales_orders(status, delivery_date);
CREATE INDEX idx_invoices_due_payment ON sales_invoices(due_date, payment_status);
CREATE INDEX idx_audit_trails_time ON audit_trails(timestamp DESC);
CREATE INDEX idx_snapshots_date ON inventory_snapshots(snapshot_date);
