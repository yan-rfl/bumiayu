import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { action, admin_id, items, admin_notes, bypass_token } = body;

    const supabase = createAdminClient();

    // Ambil data pesanan saat ini
    const { data: order, error: fetchErr } = await supabase
      .from('sales_orders')
      .select('*, store:stores(*), items:sales_order_items(*)')
      .eq('id', id)
      .single();

    if (fetchErr || !order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan.' }, { status: 404 });
    }

    // =========================================================================
    // AKSI 1: EDIT KUANTITAS ITEM / TAMBAH PRODUK BARU KE PESANAN
    // =========================================================================
    if (action === 'EDIT_ITEMS') {
      if (!items || !Array.isArray(items)) {
        return NextResponse.json({ error: 'Daftar item tidak valid.' }, { status: 400 });
      }

      // 1. Dapatkan ID item yang dikirim
      const incomingItemIds = items.map((it: any) => it.id).filter(Boolean);

      // 2. Hapus item di database yang tidak ada lagi di daftar baru
      if (order.items && order.items.length > 0) {
        for (const oldIt of order.items) {
          if (!incomingItemIds.includes(oldIt.id)) {
            await supabase.from('sales_order_items').delete().eq('id', oldIt.id);
          }
        }
      }

      let newGrandTotal = 0;
      for (const item of items) {
        newGrandTotal += Number(item.total_price);

        if (item.id) {
          // Update item pesanan lama
          await supabase
            .from('sales_order_items')
            .update({
              quantity: item.quantity,
              total_price: item.total_price,
            })
            .eq('id', item.id);
        } else {
          // Insert item baru yang ditambahkan oleh Owner / Sales
          await supabase.from('sales_order_items').insert({
            sales_order_id: id,
            product_id: item.product_id,
            product_unit_id: item.product_unit_id,
            unit_name: item.unit_name,
            quantity: item.quantity,
            original_quantity: item.quantity,
            conversion_qty: item.conversion_qty || 1,
            unit_price: item.unit_price,
            total_price: item.total_price,
          });
        }
      }

      // Update total SO dan flag edited
      await supabase
        .from('sales_orders')
        .update({
          subtotal: newGrandTotal,
          grand_total: newGrandTotal,
          is_edited_by_admin: true,
          admin_notes: admin_notes || 'Pesanan diperbarui / disesuaikan.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      // Sinkronkan juga ke sales_invoices jika faktur sudah terbit
      await supabase
        .from('sales_invoices')
        .update({
          total_amount: newGrandTotal,
          remaining_balance: newGrandTotal,
          updated_at: new Date().toISOString(),
        })
        .eq('sales_order_id', id);

      // Audit trail
      if (admin_id) {
        await supabase.from('audit_trails').insert({
          user_id: admin_id,
          action_type: 'UPDATE',
          module: 'SALES_ORDER',
          record_id: order.order_no,
          new_value: { items_count: items.length, grand_total: newGrandTotal, reason: admin_notes },
          notes: `Pengguna mengedit kuantitas / item pesanan ${order.order_no}`,
        });
      }

      return NextResponse.json({ success: true, message: 'Pesanan berhasil disesuaikan.' });
    }

    // =========================================================================
    // AKSI 2: APPROVE ORDER & POTONG STOK FISIK & BUAT FAKTUR PENJUALAN
    // =========================================================================
    if (action === 'APPROVE') {
      if (order.status === 'APPROVED') {
        return NextResponse.json({ error: 'Pesanan sudah disetujui sebelumnya.' }, { status: 400 });
      }

      const today = new Date().toISOString().split('T')[0];

      // 1. Cek & Potong Stok Fisik di inventory_stocks
      for (const it of order.items) {
        const totalBaseUnitNeeded = it.quantity * it.conversion_qty;

        // Ambil stok sekarang
        const { data: stockData } = await supabase
          .from('inventory_stocks')
          .select('stock_base_unit')
          .eq('product_id', it.product_id)
          .single();

        const currentStock = stockData ? stockData.stock_base_unit : 0;
        const newStock = Math.max(0, currentStock - totalBaseUnitNeeded);

        await supabase
          .from('inventory_stocks')
          .upsert({
            product_id: it.product_id,
            stock_base_unit: newStock,
            updated_at: new Date().toISOString(),
          });
      }

      // 2. Generate Nomor Faktur INV-YYYYMMDD-XXXX
      const dateStr = today.replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const invoiceNo = `INV-${dateStr}-${randomSuffix}`;

      // 3. Tentukan jatuh tempo berdasarkan TOP toko (0 hari, 7 hari, 14 hari)
      const topDays = order.store.top_days || 0;
      const dueDateObj = new Date();
      dueDateObj.setDate(dueDateObj.getDate() + topDays);
      const dueDate = dueDateObj.toISOString().split('T')[0];

      // Validasi admin_id agar sesuai dengan tabel profiles
      let validAdminId = admin_id;
      if (admin_id) {
        const { data: pCheck } = await supabase.from('profiles').select('id').eq('id', admin_id).maybeSingle();
        if (!pCheck) validAdminId = null;
      }
      if (!validAdminId) {
        const { data: defProfile } = await supabase.from('profiles').select('id').limit(1).maybeSingle();
        validAdminId = defProfile?.id;
      }

      // 4. Cek atau Buat Faktur Penjualan (sales_invoices)
      const { data: existingInvoice } = await supabase
        .from('sales_invoices')
        .select('*')
        .eq('sales_order_id', order.id)
        .maybeSingle();

      let finalInvoice = existingInvoice;
      if (!existingInvoice) {
        const { data: createdInv, error: invErr } = await supabase
          .from('sales_invoices')
          .insert({
            invoice_no: invoiceNo,
            sales_order_id: order.id,
            store_id: order.store_id,
            sales_id: order.sales_id,
            invoice_date: today,
            due_date: dueDate,
            total_amount: order.grand_total,
            remaining_balance: order.grand_total,
            payment_status: 'BELUM_LUNAS',
            printed_count: 0,
          })
          .select()
          .single();

        if (invErr) {
          return NextResponse.json({ error: invErr.message }, { status: 400 });
        }
        finalInvoice = createdInv;
      } else {
        await supabase
          .from('sales_invoices')
          .update({
            total_amount: order.grand_total,
            remaining_balance: order.grand_total,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingInvoice.id);
      }

      // 5. Tambah saldo piutang toko jika bukan cash lunas
      if (topDays > 0) {
        const newDebt = Number(order.store.current_debt || 0) + Number(order.grand_total);
        await supabase
          .from('stores')
          .update({ current_debt: newDebt })
          .eq('id', order.store_id);
      }

      // 6. Update status sales_order menjadi APPROVED
      await supabase
        .from('sales_orders')
        .update({
          status: 'APPROVED',
          approved_by: validAdminId,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      // 7. Catat Audit Trail
      if (validAdminId) {
        await supabase.from('audit_trails').insert({
          user_id: validAdminId,
          action_type: 'APPROVE',
          module: 'SALES_ORDER',
          record_id: order.order_no,
          new_value: { invoice_no: finalInvoice?.invoice_no || invoiceNo, status: 'APPROVED' },
          notes: `Admin menyetujui pesanan ${order.order_no} dan menerbitkan faktur ${finalInvoice?.invoice_no || invoiceNo}`,
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Pesanan berhasil disetujui, stok dipotong, dan faktur terbit.',
        invoice: finalInvoice,
      });
    }

    // =========================================================================
    // AKSI 3: BYPASS TOKEN ADMIN (IZINKAN ORDER TOKO YANG OVER LIMIT / TERKUNCI)
    // =========================================================================
    if (action === 'BYPASS_CREDIT') {
      await supabase
        .from('sales_orders')
        .update({
          status: 'SUBMITTED',
          bypass_token: bypass_token || 'APPROVED_BY_OWNER',
          admin_notes: admin_notes || 'Diberikan dispensasi kredit oleh Owner.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      return NextResponse.json({ success: true, message: 'Dispensasi kredit berhasil diberikan.' });
    }

    // =========================================================================
    // AKSI 4: REJECT ORDER
    // =========================================================================
    if (action === 'REJECT') {
      await supabase
        .from('sales_orders')
        .update({
          status: 'REJECTED',
          admin_notes: admin_notes || 'Pesanan ditolak oleh Admin.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      return NextResponse.json({ success: true, message: 'Pesanan ditolak.' });
    }

    return NextResponse.json({ error: 'Aksi tidak dikenali.' }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
