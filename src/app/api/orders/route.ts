import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const date = searchParams.get('date');

    const supabase = createAdminClient();

    let query = supabase
      .from('sales_orders')
      .select(`
        *,
        store:stores(*),
        sales:profiles!sales_orders_sales_id_fkey(*),
        items:sales_order_items(
          *,
          product:products(*)
        )
      `)
      .order('created_at', { ascending: false });

    if (status && status !== 'ALL') {
      query = query.eq('status', status);
    }
    if (date) {
      query = query.eq('order_date', date);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Create New Sales Order (Sales Mobile PWA)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      store_id,
      sales_id,
      delivery_date,
      items, // array of { product_id, product_unit_id, unit_name, quantity, conversion_qty, unit_price, total_price }
      notes,
    } = body;

    if (!store_id || !sales_id || !items || items.length === 0) {
      return NextResponse.json({ error: 'Data pesanan tidak lengkap.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Cek status toko (Plafon Piutang & Double Order / Jatuh Tempo)
    const { data: store, error: storeErr } = await supabase
      .from('stores')
      .select('*')
      .eq('id', store_id)
      .single();

    if (storeErr || !store) {
      return NextResponse.json({ error: 'Toko tidak ditemukan.' }, { status: 404 });
    }

    // 2. Hitung total
    let grandTotal = 0;
    for (const item of items) {
      grandTotal += Number(item.total_price);
    }

    // 3. Tentukan status pesanan:
    // Cek apakah ada invoice belum lunas yang sudah lewat jatuh tempo
    const today = new Date().toISOString().split('T')[0];
    const { data: unpaidOverdue } = await supabase
      .from('sales_invoices')
      .select('id, invoice_no, due_date')
      .eq('store_id', store_id)
      .neq('payment_status', 'LUNAS')
      .lt('due_date', today);

    let orderStatus = 'SUBMITTED';
    let holdReason = null;

    if (store.is_locked) {
      orderStatus = 'PENDING_PAYMENT';
      holdReason = 'Toko dalam status terkunci oleh Admin.';
    } else if (unpaidOverdue && unpaidOverdue.length > 0) {
      orderStatus = 'PENDING_PAYMENT';
      holdReason = `Terdapat faktur lewat jatuh tempo (${unpaidOverdue.map((i) => i.invoice_no).join(', ')}).`;
    } else if (store.credit_limit > 0 && Number(store.current_debt) + grandTotal > Number(store.credit_limit)) {
      orderStatus = 'PENDING_PAYMENT';
      holdReason = `Total pesanan melebihi sisa plafon kredit (Plafon: Rp ${Number(store.credit_limit).toLocaleString('id-ID')}).`;
    }

    // 4. Generate Nomor Pesanan SO-YYYYMMDD-XXXX
    const dateStr = today.replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNo = `SO-${dateStr}-${randomSuffix}`;

    // 5. Insert Sales Order
    const { data: order, error: orderErr } = await supabase
      .from('sales_orders')
      .insert({
        order_no: orderNo,
        store_id,
        sales_id,
        order_date: today,
        delivery_date: delivery_date || today,
        status: orderStatus,
        hold_reason: holdReason,
        subtotal: grandTotal,
        grand_total: grandTotal,
        admin_notes: notes || null,
      })
      .select()
      .single();

    if (orderErr) {
      return NextResponse.json({ error: orderErr.message }, { status: 400 });
    }

    // 6. Insert Order Items
    const orderItems = items.map((it: {
      product_id: string;
      product_unit_id: string;
      unit_name: string;
      quantity: number;
      conversion_qty: number;
      unit_price: number;
      total_price: number;
    }) => ({
      sales_order_id: order.id,
      product_id: it.product_id,
      product_unit_id: it.product_unit_id,
      unit_name: it.unit_name,
      quantity: it.quantity,
      original_quantity: it.quantity,
      conversion_qty: it.conversion_qty,
      unit_price: it.unit_price,
      total_price: it.total_price,
    }));

    const { error: itemsErr } = await supabase.from('sales_order_items').insert(orderItems);

    if (itemsErr) {
      return NextResponse.json({ error: itemsErr.message }, { status: 400 });
    }

    // 7. Catat Audit Trail
    await supabase.from('audit_trails').insert({
      user_id: sales_id,
      action_type: 'CREATE',
      module: 'SALES_ORDER',
      record_id: orderNo,
      new_value: { order_no: orderNo, store_name: store.name, grand_total: grandTotal, status: orderStatus },
      notes: `Sales membuat pesanan untuk ${store.name}`,
    });

    return NextResponse.json({ success: true, order, data: order });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
