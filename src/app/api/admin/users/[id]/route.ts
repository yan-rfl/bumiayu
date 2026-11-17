import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { usernameToEmail } from '@/lib/auth/helpers';

// PATCH: Update data user (sales atau admin)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const body = await req.json();
    const { username, name, password, phone, is_active, admin_id } = body;

    const supabase = createAdminClient();

    // 1. Ambil data profil saat ini
    const { data: currentProfile, error: fetchErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !currentProfile) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }

    const cleanUsername = username ? username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '') : currentProfile.username;
    const cleanName = name !== undefined ? name.trim() : currentProfile.full_name;

    // 2. Jika username diubah, pastikan tidak duplikat
    if (cleanUsername !== currentProfile.username) {
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', cleanUsername)
        .neq('id', id)
        .maybeSingle();

      if (existingUser) {
        return NextResponse.json(
          { error: `Username "${cleanUsername}" sudah digunakan akun lain.` },
          { status: 400 }
        );
      }
    }

    // 3. Update Supabase Auth jika ada password baru atau username berubah
    const authUpdatePayload: {
      password?: string;
      email?: string;
      user_metadata?: Record<string, unknown>;
    } = {};

    if (password && password.trim().length > 0) {
      if (password.trim().length < 6) {
        return NextResponse.json({ error: 'Password baru minimal 6 karakter.' }, { status: 400 });
      }
      authUpdatePayload.password = password.trim();
    }

    if (cleanUsername !== currentProfile.username) {
      authUpdatePayload.email = usernameToEmail(cleanUsername);
    }

    authUpdatePayload.user_metadata = {
      role: currentProfile.role,
      full_name: cleanName,
      username: cleanUsername,
    };

    const { error: authErr } = await supabase.auth.admin.updateUserById(id, authUpdatePayload);
    if (authErr) {
      return NextResponse.json(
        { error: authErr.message || 'Gagal memperbarui kredensial autentikasi.' },
        { status: 400 }
      );
    }

    // 4. Update di tabel profiles
    const profileUpdatePayload: Record<string, unknown> = {
      username: cleanUsername,
      full_name: cleanName,
    };

    if (phone !== undefined) {
      profileUpdatePayload.phone = phone ? phone.trim() : null;
    }

    if (is_active !== undefined) {
      profileUpdatePayload.is_active = is_active;
    }

    const { data: updatedProfile, error: profileErr } = await supabase
      .from('profiles')
      .update(profileUpdatePayload)
      .eq('id', id)
      .select()
      .single();

    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 400 });
    }

    // 5. Catat ke audit_logs jika admin_id diberikan
    if (admin_id) {
      try {
        await supabase.from('audit_logs').insert({
          action_type: 'UPDATE_USER',
          user_id: admin_id,
          target_table: 'profiles',
          target_id: id,
          description: `Admin memperbarui data pengguna: ${cleanName} (@${cleanUsername})`,
          metadata: {
            updated_fields: Object.keys(profileUpdatePayload),
            password_changed: Boolean(password && password.trim().length > 0),
          },
        });
      } catch (logErr) {
        console.error('Audit log error (non-fatal):', logErr);
      }
    }

    return NextResponse.json({
      message: 'Data pengguna berhasil diperbarui.',
      user: updatedProfile,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
