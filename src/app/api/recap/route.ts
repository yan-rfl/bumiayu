import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const supabase = createAdminClient();

    // Ambil semua pesanan penjualan (SO-) berstatus APPROVED untuk tanggal tersebut
    let query = supabase
      .from('sales_orders')
      .select(`
        id,
        order_no,
        order_date,
        items:sales_order_items(
          quantity,
          unit_name,
          conversion_qty,
          product:products(id, sku, name, base_unit)
        )
      `)
      .eq('status', 'APPROVED')
      .like('order_no', 'SO-%');

    if (date) {
      query = query.eq('order_date', date);
    }

    const { data: approvedOrders, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Akumulasi total KTN, BD, PCS per SKU
    const summaryMap: Record<
      string,
      {
        sku: string;
        name: string;
        total_ktn: number;
        total_bd: number;
        total_pcs: number;
        total_base_unit: number;
      }
    > = {};

    for (const order of approvedOrders || []) {
      for (const item of (order as any).items || []) {
        const sku = item.product?.sku || 'UNKNOWN';
        if (!summaryMap[sku]) {
          summaryMap[sku] = {
            sku,
            name: item.product?.name || sku,
            total_ktn: 0,
            total_bd: 0,
            total_pcs: 0,
            total_base_unit: 0,
          };
        }

        const unit = (item.unit_name || '').toUpperCase();
        if (unit === 'KTN') {
          summaryMap[sku].total_ktn += item.quantity;
        } else if (unit === 'BD') {
          summaryMap[sku].total_bd += item.quantity;
        } else {
          summaryMap[sku].total_pcs += item.quantity;
        }

        summaryMap[sku].total_base_unit += item.quantity * item.conversion_qty;
      }
    }

    const summaryList = Object.values(summaryMap);

    return NextResponse.json({
      recap_date: date,
      generated_at: new Date().toISOString(),
      total_orders_count: approvedOrders?.length || 0,
      total_orders: approvedOrders?.length || 0,
      summary: summaryList,
      items: summaryList.map((s) => ({
        product_name: s.name,
        sku: s.sku,
        total_cartons: s.total_ktn,
        total_bendits: s.total_bd,
        total_pcs: s.total_pcs,
        total_base_unit: s.total_base_unit,
      })),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
