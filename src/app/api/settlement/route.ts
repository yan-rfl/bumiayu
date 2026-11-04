import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'ALL';
    const storeId = searchParams.get('store_id');
    const salesId = searchParams.get('sales_id');

    const supabase = createAdminClient();

    let query = supabase
      .from('sales_invoices')
      .select(`
        *,
        store:stores(*),
        sales:profiles!sales_invoices_sales_id_fkey(id, full_name, username),
        sales_order:sales_orders(order_no, delivery_date),
        payments(*)
      `)
      .order('due_date', { ascending: true });

    if (status && status !== 'ALL') {
      query = query.eq('payment_status', status);
    }
    if (storeId) {
      query = query.eq('store_id', storeId);
    }
    if (salesId) {
      query = query.eq('sales_id', salesId);
    }

    const { data: invoices, error: invErr } = await query;
    if (invErr) {
      return NextResponse.json({ error: invErr.message }, { status: 400 });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Hitung ringkasan piutang
    let totalPiutang = 0;
    let totalJatuhTempo = 0;
    let totalLunasTerbayar = 0;
    let overdueCount = 0;

    (invoices || []).forEach((inv) => {
      const remaining = Number(inv.remaining_balance || 0);
      const paid = Number(inv.paid_amount || 0);
      totalLunasTerbayar += paid;

      if (inv.payment_status !== 'LUNAS' && remaining > 0) {
        totalPiutang += remaining;
        if (inv.due_date < todayStr) {
          totalJatuhTempo += remaining;
          overdueCount += 1;
        }
      }
    });

    // Ambil daftar toko yang memiliki saldo piutang / terkunci
    const { data: storesWithDebt } = await supabase
      .from('stores')
      .select('id, code, name, zone_code, top_days, credit_limit, current_debt, is_locked, phone_wa')
      .order('current_debt', { ascending: false });

    return NextResponse.json({
      invoices: invoices || [],
      stores: storesWithDebt || [],
      summary: {
        total_piutang: totalPiutang,
        total_jatuh_tempo: totalJatuhTempo,
        total_lunas_terbayar: totalLunasTerbayar,
        overdue_count: overdueCount,
        total_invoices_count: (invoices || []).length,
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
    const { invoice_id, amount, payment_method, notes, user_id } = body;

    const payAmount = Number(amount);
    if (!invoice_id || !payAmount || payAmount <= 0) {
      return NextResponse.json({ error: 'Faktur dan jumlah pembayaran valid wajib diisi.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Ambil data faktur saat ini
    const { data: invoice, error: invFetchErr } = await supabase
      .from('sales_invoices')
      .select('*, store:stores(*)')
      .eq('id', invoice_id)
      .single();

    if (invFetchErr || !invoice) {
      return NextResponse.json({ error: 'Faktur tidak ditemukan.' }, { status: 404 });
    }

    const remaining = Number(invoice.remaining_balance);
    if (remaining <= 0 || invoice.payment_status === 'LUNAS') {
      return NextResponse.json({ error: 'Faktur ini sudah lunas sebelumnya.' }, { status: 400 });
    }

    if (payAmount > remaining) {
      return NextResponse.json(
        { error: `Jumlah pembayaran (Rp ${payAmount.toLocaleString('id-ID')}) melebihi sisa tagihan (Rp ${remaining.toLocaleString('id-ID')}).` },
        { status: 400 }
      );
    }

    // 2. Generate No Pembayaran PAY-YYYYMMDD-XXXX
    const today = new Date().toISOString().split('T')[0];
    const dateStr = today.replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const paymentNo = `PAY-${dateStr}-${randomSuffix}`;

    // Pastikan user_id valid terhadap tabel profiles
    let validUserId = user_id;
    if (user_id) {
      const { data: pCheck } = await supabase.from('profiles').select('id').eq('id', user_id).maybeSingle();
      if (!pCheck) validUserId = null;
    }
    if (!validUserId) {
      const { data: defProfile } = await supabase.from('profiles').select('id').limit(1).maybeSingle();
      validUserId = defProfile?.id;
    }

    // 3. Simpan data ke tabel payments
    const { data: paymentRecord, error: payErr } = await supabase
      .from('payments')
      .insert({
        payment_no: paymentNo,
        invoice_id: invoice.id,
        store_id: invoice.store_id,
        amount: payAmount,
        payment_date: today,
        payment_method: payment_method || 'TUNAI',
        verified_by: validUserId,
        notes: notes || null,
      })
      .select()
      .single();

    if (payErr) {
      return NextResponse.json({ error: payErr.message }, { status: 400 });
    }

    // 4. Update status dan sisa tagihan sales_invoices
    const newPaidAmount = Number(invoice.paid_amount) + payAmount;
    const newRemainingBalance = Math.max(0, remaining - payAmount);
    const newStatus = newRemainingBalance <= 0 ? 'LUNAS' : 'SEBAGIAN';

    await supabase
      .from('sales_invoices')
      .update({
        paid_amount: newPaidAmount,
        remaining_balance: newRemainingBalance,
        payment_status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoice.id);

    // 5. Update saldo piutang toko di tabel stores
    if (invoice.store) {
      const currentDebt = Number(invoice.store.current_debt || 0);
      const newDebt = Math.max(0, currentDebt - payAmount);
      const creditLimit = Number(invoice.store.credit_limit || 0);

      // Jika hutang sudah kembali di bawah limit, buka kunci toko
      const isLocked = creditLimit > 0 ? newDebt > creditLimit : false;

      await supabase
        .from('stores')
        .update({
          current_debt: newDebt,
          is_locked: isLocked,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoice.store_id);
    }

    // 6. Catat Audit Trail
    if (user_id) {
      await supabase.from('audit_trails').insert({
        user_id: user_id,
        action_type: 'SETTLEMENT',
        module: 'INVOICE',
        record_id: invoice.invoice_no,
        new_value: {
          payment_no: paymentNo,
          amount_paid: payAmount,
          remaining: newRemainingBalance,
          status: newStatus,
          method: payment_method || 'TUNAI',
        },
        notes: `Pelunasan piutang faktur ${invoice.invoice_no} sebesar Rp ${payAmount.toLocaleString('id-ID')} (${payment_method || 'TUNAI'})`,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Pembayaran ${paymentNo} sebesar Rp ${payAmount.toLocaleString('id-ID')} berhasil dicatat. Status faktur: ${newStatus}`,
      data: paymentRecord,
      invoice_status: newStatus,
      new_remaining: newRemainingBalance,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
