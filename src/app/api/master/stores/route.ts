import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data: stores, error } = await supabase
      .from('stores')
      .select('*')
      .order('name');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ stores: stores || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, owner_name, phone_wa, address, zone_code, top_days, credit_limit, created_by } = body;

    if (!name || !address || !zone_code) {
      return NextResponse.json(
        { error: 'Nama toko, alamat, dan wilayah/zona wajib diisi.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Generate kode toko acak unik cth: TK-1048
    const randomCode = `TK-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data: newStore, error } = await supabase
      .from('stores')
      .insert({
        code: randomCode,
        name: name.trim(),
        owner_name: owner_name?.trim() || null,
        phone_wa: phone_wa?.trim() || '08',
        address: address.trim(),
        zone_code: zone_code.trim().toUpperCase(),
        top_days: Number(top_days || 0),
        credit_limit: Number(credit_limit || 0),
        current_debt: 0,
        is_locked: false,
        created_by: created_by || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Catat Audit Trail
    if (created_by) {
      await supabase.from('audit_trails').insert({
        user_id: created_by,
        action_type: 'CREATE',
        module: 'MASTER_DATA',
        record_id: randomCode,
        new_value: { name, address, zone_code },
        notes: `Pendaftaran toko baru ${name} (${randomCode}) di wilayah ${zone_code}`,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Toko ${name} (${randomCode}) berhasil didaftarkan.`,
      store: newStore,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
