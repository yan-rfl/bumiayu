import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// PATCH: Edit Produk (Kode Unik / SKU, Nama, Satuan, dan Stok Fisik)
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { sku, name, category, units, stock_base_unit, admin_id } = body;

    const supabase = createAdminClient();

    // 1. Ambil data produk saat ini
    const { data: currentProd, error: fetchErr } = await supabase
      .from('products')
      .select('*, units:product_units(*), stocks:inventory_stocks(*)')
      .eq('id', id)
      .single();

    if (fetchErr || !currentProd) {
      return NextResponse.json({ error: 'Produk tidak ditemukan.' }, { status: 404 });
    }

    const cleanSku = (sku || currentProd.sku).trim().toUpperCase();
    const cleanName = (name || currentProd.name).trim();

    // 2. Cek apakah SKU diubah dan bentrok dengan produk lain
    if (cleanSku !== currentProd.sku) {
      const { data: existingSku } = await supabase
        .from('products')
        .select('id')
        .eq('sku', cleanSku)
        .neq('id', id)
        .maybeSingle();

      if (existingSku) {
        return NextResponse.json({ error: `Kode Unik (SKU) "${cleanSku}" sudah digunakan.` }, { status: 400 });
      }
    }

    // 3. Update data dasar produk
    const { error: updateErr } = await supabase
      .from('products')
      .update({
        sku: cleanSku,
        name: cleanName,
        category: category || currentProd.category,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    // 4. Update Satuan & Harga Pokok & Harga Jual
    if (units && Array.isArray(units)) {
      for (const u of units) {
        const hargaPokok = Number(u.purchase_price) || 0;
        const hargaJual = Number(u.price_grosir ?? u.price_jual) || 0;

        if (u.id && !String(u.id).startsWith('temp-')) {
          await supabase
            .from('product_units')
            .update({
              unit_name: (u.unit_name || '').toUpperCase(),
              conversion_qty: Number(u.conversion_qty) || 1,
              purchase_price: hargaPokok,
              price_grosir: hargaJual,
              price_ecer: hargaJual,
            })
            .eq('id', u.id);
        } else {
          await supabase
            .from('product_units')
            .insert({
              product_id: id,
              unit_name: (u.unit_name || '').toUpperCase(),
              conversion_qty: Number(u.conversion_qty) || 1,
              purchase_price: hargaPokok,
              price_grosir: hargaJual,
              price_ecer: hargaJual,
              is_default_sales: !!u.is_default_sales,
            });
        }
      }
    }

    // 5. Update Penyesuaian Stok Fisik jika ada
    if (typeof stock_base_unit === 'number') {
      await supabase
        .from('inventory_stocks')
        .upsert({
          product_id: id,
          stock_base_unit: stock_base_unit,
          updated_at: new Date().toISOString(),
        });
    }

    // 6. Audit Trail
    if (admin_id) {
      await supabase.from('audit_trails').insert({
        user_id: admin_id,
        action_type: 'UPDATE',
        module: 'MASTER_DATA',
        record_id: cleanSku,
        old_value: { sku: currentProd.sku, name: currentProd.name },
        new_value: { sku: cleanSku, name: cleanName, stock: stock_base_unit },
        notes: `Admin mengedit produk ${cleanSku}`,
      });
    }

    return NextResponse.json({ success: true, message: 'Produk berhasil diperbarui.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
