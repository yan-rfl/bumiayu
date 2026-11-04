import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7); // e.g. "2026-11"
    const category = searchParams.get('category');
    const claimedBy = searchParams.get('claimed_by');

    const supabase = createAdminClient();

    const currentMonth = month || new Date().toISOString().slice(0, 7); // e.g. "2026-11"
    const [yearStr, mStr] = currentMonth.split('-');
    const year = parseInt(yearStr, 10);
    const m = parseInt(mStr, 10);
    const lastDayOfMonth = new Date(year, m, 0).getDate();

    const startDate = `${currentMonth}-01`;
    const endDate = `${currentMonth}-${String(lastDayOfMonth).padStart(2, '0')}`;

    // 1. Ambil data Beban Operasional
    let expQuery = supabase
      .from('operational_expenses')
      .select('*, claimed_by_user:profiles!operational_expenses_claimed_by_fkey(id, full_name, username)')
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)
      .order('expense_date', { ascending: false });

    if (category && category !== 'ALL') {
      expQuery = expQuery.eq('category', category);
    }
    if (claimedBy) {
      expQuery = expQuery.eq('claimed_by', claimedBy);
    }

    const { data: expenses, error: expErr } = await expQuery;
    if (expErr) {
      return NextResponse.json({ error: expErr.message }, { status: 400 });
    }

    // Hitung breakdown per kategori beban
    const categoryBreakdown: Record<string, number> = {
      BBM: 0,
      PARKIR_RETRIBUSI: 0,
      REPARASI_ARMADA: 0,
      GAJI_BONUS: 0,
      OPERASIONAL_LAINNYA: 0,
    };

    let totalExpenses = 0;
    (expenses || []).forEach((exp) => {
      const amt = Number(exp.amount || 0);
      totalExpenses += amt;
      if (categoryBreakdown[exp.category] !== undefined) {
        categoryBreakdown[exp.category] += amt;
      } else {
        categoryBreakdown['OPERASIONAL_LAINNYA'] += amt;
      }
    });

    // 2. Hitung Omset Penjualan (Revenue) dari Faktur Penjualan (INV-) di bulan ini
    const { data: invoices } = await supabase
      .from('sales_invoices')
      .select('invoice_no, total_amount, invoice_date')
      .like('invoice_no', 'INV-%')
      .gte('invoice_date', startDate)
      .lte('invoice_date', endDate);

    const totalRevenue = (invoices || []).reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

    // 3. Hitung HPP (COGS) dari pesanan penjualan (SO-) berstatus APPROVED pada periode tersebut
    const { data: approvedOrders } = await supabase
      .from('sales_orders')
      .select(`
        id,
        order_no,
        status,
        order_date,
        items:sales_order_items(
          quantity,
          product_unit:product_units(purchase_price)
        )
      `)
      .like('order_no', 'SO-%')
      .eq('status', 'APPROVED')
      .gte('order_date', startDate)
      .lte('order_date', endDate);

    let totalCogs = 0;
    (approvedOrders || []).forEach((ord: any) => {
      (ord.items || []).forEach((it: any) => {
        const purchasePrice = Number(it.product_unit?.purchase_price || 0);
        totalCogs += Number(it.quantity || 0) * purchasePrice;
      });
    });

    const grossProfit = totalRevenue - totalCogs;
    const netProfit = grossProfit - totalExpenses;
    const grossMarginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const netMarginPct = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return NextResponse.json({
      month,
      expenses: expenses || [],
      category_breakdown: categoryBreakdown,
      pnl: {
        total_revenue: totalRevenue,
        total_cogs: totalCogs,
        gross_profit: grossProfit,
        gross_margin_pct: Number(grossMarginPct.toFixed(1)),
        total_expenses: totalExpenses,
        net_profit: netProfit,
        net_margin_pct: Number(netMarginPct.toFixed(1)),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { category, amount, description, expense_date, claimed_by, is_verified, verified_by } = body;

    const numAmount = Number(amount);
    if (!category || !numAmount || numAmount <= 0 || !description || !claimed_by) {
      return NextResponse.json(
        { error: 'Kategori, nominal > 0, deskripsi, dan pengguna pengaju wajib diisi.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const today = expense_date || new Date().toISOString().split('T')[0];
    const dateStr = today.replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const expenseNo = `EXP-${dateStr}-${randomSuffix}`;

    const { data: newExp, error: insErr } = await supabase
      .from('operational_expenses')
      .insert({
        expense_no: expenseNo,
        category,
        amount: numAmount,
        description,
        expense_date: today,
        claimed_by,
        is_verified: is_verified !== undefined ? is_verified : true,
        verified_by: verified_by || (is_verified ? claimed_by : null),
      })
      .select('*, claimed_by_user:profiles!operational_expenses_claimed_by_fkey(id, full_name, username)')
      .single();

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 400 });
    }

    // Catat ke Audit Trail
    await supabase.from('audit_trails').insert({
      user_id: claimed_by,
      action_type: 'CREATE',
      module: 'EXPENSE',
      record_id: expenseNo,
      new_value: { category, amount: numAmount, description, expense_date: today },
      notes: `Pencatatan pengeluaran operasional ${expenseNo} sebesar Rp ${numAmount.toLocaleString('id-ID')} (${category})`,
    });

    return NextResponse.json({
      success: true,
      message: `Beban operasional ${expenseNo} sebesar Rp ${numAmount.toLocaleString('id-ID')} berhasil dicatat.`,
      data: newExp,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
