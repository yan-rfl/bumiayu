import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const salesId = searchParams.get('sales_id');
    const date = searchParams.get('date');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    const supabase = createAdminClient();

    let query = supabase
      .from('beat_route_schedules')
      .select('*, sales:profiles!beat_route_schedules_sales_id_fkey(id, full_name, username)')
      .order('schedule_date', { ascending: true });

    if (salesId) {
      query = query.eq('sales_id', salesId);
    }
    if (date) {
      query = query.eq('schedule_date', date);
    } else if (startDate && endDate) {
      query = query.gte('schedule_date', startDate).lte('schedule_date', endDate);
    }

    const { data: schedules, error: schedErr } = await query;
    if (schedErr) {
      return NextResponse.json({ error: schedErr.message }, { status: 400 });
    }

    // Ambil daftar sales aktif
    const { data: salesList } = await supabase
      .from('profiles')
      .select('id, full_name, username')
      .eq('role', 'sales')
      .eq('is_active', true);

    // Ambil daftar unik seluruh zona toko
    const { data: stores } = await supabase
      .from('stores')
      .select('zone_code');

    const distinctZones = Array.from(new Set((stores || []).map((s) => s.zone_code).filter(Boolean))).sort();

    return NextResponse.json({
      data: schedules || [],
      sales_list: salesList || [],
      zones: distinctZones,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sales_id, schedule_date, zone_codes, notes, admin_id } = body;

    if (!sales_id || !schedule_date || !Array.isArray(zone_codes)) {
      return NextResponse.json(
        { error: 'sales_id, schedule_date, dan zone_codes (array) wajib diisi.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Upsert jadwal rute
    const { data, error } = await supabase
      .from('beat_route_schedules')
      .upsert(
        {
          sales_id,
          schedule_date,
          zone_codes,
          notes: notes || null,
          created_by: admin_id || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'schedule_date,sales_id' }
      )
      .select('*, sales:profiles!beat_route_schedules_sales_id_fkey(id, full_name, username)')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Catat Audit Trail jika admin_id diberikan
    if (admin_id) {
      await supabase.from('audit_trails').insert({
        user_id: admin_id,
        action_type: 'UPDATE',
        module: 'BEAT_ROUTE',
        record_id: `${schedule_date}_${sales_id}`,
        new_value: { schedule_date, zone_codes, notes },
        notes: `Admin memperbarui jadwal rute sales untuk tanggal ${schedule_date}: [${zone_codes.join(', ')}]`,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Jadwal rute berhasil disimpan.',
      data,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const adminId = searchParams.get('admin_id');

    if (!id) {
      return NextResponse.json({ error: 'ID jadwal wajib disertakan.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase.from('beat_route_schedules').delete().eq('id', id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (adminId) {
      await supabase.from('audit_trails').insert({
        user_id: adminId,
        action_type: 'DELETE',
        module: 'BEAT_ROUTE',
        record_id: id,
        notes: `Admin menghapus jadwal rute ${id}`,
      });
    }

    return NextResponse.json({ success: true, message: 'Jadwal rute berhasil dihapus.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
