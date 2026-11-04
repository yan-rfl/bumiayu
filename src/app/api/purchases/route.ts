import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST: Buat Faktur Pembelian (Stok Masuk)
// Akan menambah stok fisik di gudang, mencatat faktur pembelian PO, dan mencatat beban modal keluar.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      store_id, // Toko asal pembelian / supplier
      purchase_date,
      items, // array of { product_id, product_unit_id, unit_name, quantity, conversion_qty, unit_price, total_price }
      notes,
      admin_id,
    } = body;

    if (!store_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Toko asal pembelian dan minimal 1 produk wajib diisi.' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const today = purchase_date || new Date().toISOString().split('T')[0];
    const dateStr = today.replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);

    // 1. Ambil data Toko / Supplier
    const { data: store, error: storeErr } = await supabase
      .from('stores')
      .select('*')
      .eq('id', store_id)
      .single();

    if (storeErr || !store) {
      return NextResponse.json({ error: 'Toko asal pembelian tidak ditemukan.' }, { status: 404 });
    }

    // 2. Generate No. PO & No. Faktur Pembelian
    const orderNo = `PO-${dateStr}-${randomSuffix}`;
    const invoiceNo = `PUR-${dateStr}-${randomSuffix}`;

    const grandTotal = items.reduce((sum: number, it: any) => sum + Number(it.total_price || 0), 0);

    // Pastikan user_id valid terhadap tabel profiles
    let validUserId = admin_id;
    if (admin_id) {
      const { data: pCheck } = await supabase.from('profiles').select('id').eq('id', admin_id).maybeSingle();
      if (!pCheck) validUserId = null;
    }
    if (!validUserId) {
      const { data: defProfile } = await supabase.from('profiles').select('id').limit(1).maybeSingle();
      validUserId = defProfile?.id;
    }

    // 3. Simpan ke sales_orders (sebagai Purchase Order yang sudah APPROVED)
    const { data: newOrder, error: orderErr } = await supabase
      .from('sales_orders')
      .insert({
        order_no: orderNo,
        store_id: store.id,
        sales_id: validUserId,
        order_date: today,
        delivery_date: today,
        status: 'APPROVED',
        subtotal: grandTotal,
        grand_total: grandTotal,
        is_edited_by_admin: false,
        admin_notes: `[FAKTUR_PEMBELIAN_STOK] ${notes || 'Pembelian Stok Masuk'}`,
        approved_by: validUserId,
        approved_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderErr || !newOrder) {
      return NextResponse.json({ error: orderErr?.message || 'Gagal membuat purchase order.' }, { status: 400 });
    }

    // 4. Simpan item-item pembelian & Tambah Stok Fisik Gudang
    for (const it of items) {
      const qty = Number(it.quantity) || 1;
      const convQty = Number(it.conversion_qty) || 1;
      const totalBaseQty = qty * convQty;

      // Simpan item pesanan
      await supabase.from('sales_order_items').insert({
        sales_order_id: newOrder.id,
        product_id: it.product_id,
        product_unit_id: it.product_unit_id,
        unit_name: it.unit_name,
        quantity: qty,
        original_quantity: qty,
        conversion_qty: convQty,
        unit_price: Number(it.unit_price) || 0,
        total_price: Number(it.total_price) || 0,
      });

      // Update stok gudang (TAMBAH STOK FISIK)
      const { data: existingStock } = await supabase
        .from('inventory_stocks')
        .select('stock_base_unit')
        .eq('product_id', it.product_id)
        .maybeSingle();

      const curStock = existingStock ? Number(existingStock.stock_base_unit) : 0;
      const newStock = curStock + totalBaseQty;

      await supabase.from('inventory_stocks').upsert({
        product_id: it.product_id,
        stock_base_unit: newStock,
        updated_at: new Date().toISOString(),
      });
    }

    // 5. Buat Faktur Pembelian di sales_invoices
    await supabase.from('sales_invoices').insert({
      invoice_no: invoiceNo,
      sales_order_id: newOrder.id,
      store_id: store.id,
      sales_id: validUserId,
      invoice_date: today,
      due_date: today,
      total_amount: grandTotal,
      paid_amount: grandTotal,
      remaining_balance: 0,
      payment_status: 'LUNAS',
      printed_count: 0,
    });

    // 6. Catat Beban Modal Keluar di operational_expenses
    const expenseNo = `EXP-${dateStr}-${randomSuffix}`;
    await supabase.from('operational_expenses').insert({
      expense_no: expenseNo,
      category: 'OPERASIONAL_LAINNYA',
      amount: grandTotal,
      description: `Pembelian Stok Masuk (${orderNo}) dari ${store.name}`,
      expense_date: today,
      claimed_by: validUserId,
      is_verified: true,
      verified_by: validUserId,
    });

    // 7. Catat Audit Trail
    if (validUserId) {
      await supabase.from('audit_trails').insert({
        user_id: validUserId,
        action_type: 'CREATE',
        module: 'INVENTORY',
        record_id: orderNo,
        new_value: { invoice_no: invoiceNo, grand_total: grandTotal, store: store.name },
        notes: `Admin menerbitkan Faktur Pembelian Stok Masuk ${orderNo} (${invoiceNo}) senilai Rp ${grandTotal.toLocaleString('id-ID')} dari ${store.name}`,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Faktur Pembelian ${orderNo} berhasil dicatat, stok gudang otomatis bertambah.`,
      order: newOrder,
      invoice_no: invoiceNo,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
