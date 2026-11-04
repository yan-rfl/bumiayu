import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET: Ambil semua produk + multi satuan + stok fisik + snapshot H-1
export async function GET() {
  try {
    const supabase = createAdminClient();
    const today = new Date().toISOString().split('T')[0];

    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        units:product_units(*),
        stocks:inventory_stocks(stock_base_unit),
        snapshots:inventory_snapshots(stock_base_unit, snapshot_date)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const formatted = (products || []).map((p: any) => {
      const snapshot = p.snapshots?.find((s: any) => s.snapshot_date <= today);
      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        base_unit: p.base_unit,
        is_active: p.is_active,
        units: (p.units || []).sort((a: any, b: any) => b.conversion_qty - a.conversion_qty),
        stock_base_unit: p.stocks?.stock_base_unit || 0,
        snapshot_stock_h1: snapshot ? snapshot.stock_base_unit : (p.stocks?.stock_base_unit || 0),
      };
    });

    return NextResponse.json({ products: formatted });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST: Tambah Produk Baru dengan Kode Unik (SKU), Multi-Satuan & Stok Awal
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      sku,
      name,
      category = 'Charm',
      base_unit = 'PCS',
      units, // array of { unit_name, conversion_qty, purchase_price, price_grosir, price_ecer }
      initial_stock = 0, // dalam PCS
      admin_id,
    } = body;

    const cleanSku = (sku || '').trim().toUpperCase();
    const cleanName = (name || '').trim();

    if (!cleanSku || !cleanName) {
      return NextResponse.json({ error: 'Kode Unik (SKU) dan Nama Produk wajib diisi.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Cek duplikasi SKU
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('sku', cleanSku)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: `Kode Unik (SKU) "${cleanSku}" sudah digunakan produk lain.` }, { status: 400 });
    }

    // 2. Insert Produk
    const { data: newProd, error: prodErr } = await supabase
      .from('products')
      .insert({
        sku: cleanSku,
        name: cleanName,
        category: category || 'Charm',
        base_unit: base_unit || 'PCS',
        is_active: true,
      })
      .select()
      .single();

    if (prodErr || !newProd) {
      return NextResponse.json({ error: prodErr?.message || 'Gagal menyimpan produk.' }, { status: 400 });
    }

    const productId = newProd.id;

    // 3. Insert Satuan Bertingkat (Default: KTN, BD, PCS jika tidak diatur custom)
    const defaultUnits = units && units.length > 0 ? units : [
      { unit_name: 'KTN', conversion_qty: 24, purchase_price: 60000, price_grosir: 68000, price_ecer: 75000, is_default_sales: true },
      { unit_name: 'BD', conversion_qty: 3, purchase_price: 7500, price_grosir: 8600, price_ecer: 9500, is_default_sales: false },
      { unit_name: 'PCS', conversion_qty: 1, purchase_price: 2500, price_grosir: 2900, price_ecer: 3200, is_default_sales: false },
    ];

    for (const u of defaultUnits) {
      await supabase.from('product_units').insert({
        product_id: productId,
        unit_name: (u.unit_name || '').toUpperCase(),
        conversion_qty: Number(u.conversion_qty) || 1,
        purchase_price: Number(u.purchase_price) || 0,
        price_grosir: Number(u.price_grosir) || 0,
        price_ecer: Number(u.price_ecer) || 0,
        is_default_sales: !!u.is_default_sales,
      });
    }

    // 4. Inisialisasi Stok Fisik Gudang
    const stockQty = Number(initial_stock) || 0;
    await supabase.from('inventory_stocks').upsert({
      product_id: productId,
      stock_base_unit: stockQty,
      minimum_stock_alert: 60,
    });

    // 5. Inisialisasi Snapshot Stok H-1
    const today = new Date().toISOString().split('T')[0];
    await supabase.from('inventory_snapshots').upsert({
      snapshot_date: today,
      product_id: productId,
      stock_base_unit: stockQty,
    });

    // 6. Audit Trail Log
    if (admin_id) {
      await supabase.from('audit_trails').insert({
        user_id: admin_id,
        action_type: 'CREATE',
        module: 'MASTER_DATA',
        record_id: cleanSku,
        new_value: { sku: cleanSku, name: cleanName, stock: stockQty },
        notes: `Admin menambahkan produk baru: ${cleanName} (${cleanSku})`,
      });
    }

    return NextResponse.json({ success: true, product: newProd });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
