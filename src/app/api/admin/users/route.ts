import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { usernameToEmail } from '@/lib/auth/helpers';

// GET: Ambil seluruh daftar pengguna (Owner / Admin & Sales)
export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data: users, error } = await supabase
      .from('profiles')
      .select('*')
      .order('role', { ascending: true })
      .order('full_name', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ users: users || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST: Tambah User Sales Baru
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, name, password, phone, role = 'sales', admin_id } = body;

    const cleanUsername = (username || '').trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    const cleanName = (name || '').trim();

    if (!cleanUsername || !cleanName || !password) {
      return NextResponse.json(
        { error: 'Username, Nama Lengkap, dan Password wajib diisi.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password minimal 6 karakter.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Cek duplikasi username di tabel profiles
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', cleanUsername)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: `Username "${cleanUsername}" sudah digunakan. Silakan pilih username lain.` },
        { status: 400 }
      );
    }

    // 2. Buat user di Supabase Auth
    const virtualEmail = usernameToEmail(cleanUsername);
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: virtualEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        role: role,
        full_name: cleanName,
        username: cleanUsername,
      },
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Gagal membuat akun autentikasi.' },
        { status: 400 }
      );
    }

    const newUserId = authData.user.id;

    // 3. Simpan profil ke tabel profiles
    const { data: newProfile, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: newUserId,
        username: cleanUsername,
        full_name: cleanName,
        phone: phone?.trim() || null,
        role: role,
        is_active: true,
      })
      .select()
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: `Akun auth terbuat namun profil gagal disimpan: ${profileError.message}` },
        { status: 400 }
      );
    }

    // 4. Catat Audit Trail
    if (admin_id) {
      await supabase.from('audit_trails').insert({
        user_id: admin_id,
        action_type: 'CREATE',
        module: 'USER_MANAGEMENT',
        record_id: cleanUsername,
        new_value: { username: cleanUsername, full_name: cleanName, role: role },
        notes: `Admin mendaftarkan user ${role}: ${cleanName} (@${cleanUsername})`,
      });
    }

    return NextResponse.json({
      success: true,
      message: `User ${cleanName} (@${cleanUsername}) berhasil didaftarkan.`,
      user: newProfile,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
