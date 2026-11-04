'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, User, Lock, ArrowRight, Loader2, Smartphone, Share2, X } from 'lucide-react';
import { usernameToEmail } from '@/lib/auth/helpers';
import { createClient } from '@/lib/supabase/client';
import { CustomModalDialog, ModalDialogConfig } from '@/components/UIFeedback';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showIosInstallModal, setShowIosInstallModal] = useState(false);
  const [modalDialog, setModalDialog] = useState<ModalDialogConfig | null>(null);

  // Cek apakah sudah pernah login sebelumnya (Session Persistence)
  useEffect(() => {
    try {
      const savedUserStr = localStorage.getItem('bumiayu_auth_user');
      const savedRole = localStorage.getItem('bumiayu_role');
      if (savedUserStr && savedRole) {
        if (savedRole === 'owner') {
          router.replace('/admin');
          return;
        } else {
          router.replace('/sales');
          return;
        }
      }
    } catch (e) {
      console.error('Error checking saved session', e);
    }
  }, [router]);

  // Lock scroll saat modal terbuka
  useEffect(() => {
    if (showIosInstallModal || modalDialog?.isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [showIosInstallModal, modalDialog?.isOpen]);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (!isStandalone) {
      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShowInstallBanner(true);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);

      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIos) {
        setShowInstallBanner(true);
      }

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setShowInstallBanner(false);
      }
      setDeferredPrompt(null);
    } else {
      setShowIosInstallModal(true);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername || !password) {
      setErrorMsg('Silakan isi username dan password Anda.');
      return;
    }

    setLoading(true);

    try {
      const virtualEmail = usernameToEmail(cleanUsername);
      const supabase = createClient();

      // Autentikasi ke Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: virtualEmail,
        password: password,
      });

      if (authError) {
        // Fallback info jika Supabase belum dikonfigurasi (.env.local masih placeholder)
        if (
          process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') ||
          authError.message.includes('fetch')
        ) {
          const detectedRole = cleanUsername.includes('admin') || cleanUsername.includes('owner') ? 'owner' : 'sales';
          const simUser = {
            id: detectedRole === 'owner' ? '00000000-0000-0000-0000-000000000001' : '00000000-0000-0000-0000-000000000002',
            email: virtualEmail,
            username: cleanUsername,
            full_name: detectedRole === 'owner' ? 'Owner BumiAyu' : 'Sales Budi Santoso',
            role: detectedRole,
          };
          localStorage.setItem('bumiayu_auth_user', JSON.stringify(simUser));
          localStorage.setItem('bumiayu_role', detectedRole);

          setModalDialog({
            isOpen: true,
            type: 'alert',
            title: 'Mode Simulasi Aktif',
            message: `Kredensial Supabase di .env.local belum diisi.\n\nSimulasi login berhasil sebagai:\nUsername: ${cleanUsername}\nRole Terdeteksi: ${detectedRole.toUpperCase()}\n\nSetelah Supabase tersambung, sistem akan otomatis membaca role dari profil pengguna.`,
            confirmText: 'Lanjutkan Masuk',
            onConfirm: () => {
              if (detectedRole === 'owner') {
                router.push('/admin');
              } else {
                router.push('/sales');
              }
            },
          });
          return;
        }

        setErrorMsg('Username atau password salah. Silakan coba lagi.');
        setLoading(false);
        return;
      }

      // Ambil data role pengguna
      if (authData.user) {
        // 1. Cek metadata akun dari Supabase Auth
        const metaRole = authData.user.user_metadata?.role;

        // 2. Cek tabel profiles (jika izin RLS mengizinkan)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role, is_active')
          .eq('id', authData.user.id)
          .single();

        if (profileData && profileData.is_active === false) {
          setErrorMsg('Akun Anda dinonaktifkan oleh Admin. Hubungi Owner untuk aktivasi.');
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        const finalRole =
          profileData?.role ||
          metaRole ||
          (cleanUsername.includes('admin') || cleanUsername.includes('owner') ? 'owner' : 'sales');

        const authUser = {
          id: authData.user.id,
          email: authData.user.email,
          username: cleanUsername,
          full_name: (profileData as any)?.full_name || authData.user.user_metadata?.full_name || cleanUsername,
          role: finalRole,
        };
        localStorage.setItem('bumiayu_auth_user', JSON.stringify(authUser));
        localStorage.setItem('bumiayu_role', finalRole);

        // Pengalihan halaman otomatis berdasarkan role
        if (finalRole === 'owner') {
          router.push('/admin');
        } else {
          router.push('/sales');
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Terjadi kendala saat login.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-emerald-50/70 via-slate-100 to-slate-200 text-slate-900 dark:from-emerald-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100 transition-colors duration-200">
      {/* Header Bersih & Adaptif Sistem */}
      <header className="px-6 py-5 flex items-center justify-between border-b border-emerald-200/70 bg-white/70 dark:border-emerald-900/40 dark:bg-slate-950/60 backdrop-blur-md transition-colors duration-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-bold">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              BumiAyu
            </h1>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              Distribusi & Pemesanan
            </p>
          </div>
        </div>
      </header>

      {/* Main Single Login Card */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 gap-3.5">
        {/* Banner Install PWA di Halaman Sign-in */}
        {showInstallBanner && (
          <div className="w-full max-w-md p-3.5 rounded-2xl bg-slate-900 text-white flex items-center justify-between text-xs shadow-xl border border-slate-700 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <div className="font-extrabold text-xs text-white">Pasang Aplikasi BumiAyu di HP</div>
                <div className="text-[11px] text-slate-300">Pasang di layar utama HP agar tidak perlu sign in dua kali</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleInstallClick}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-extrabold text-xs text-white transition-colors shadow-xs"
              >
                Pasang
              </button>
              <button
                type="button"
                onClick={() => setShowInstallBanner(false)}
                className="p-1 text-slate-400 hover:text-white"
                title="Tutup"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <div className="w-full max-w-md bg-white/90 border border-slate-200/80 shadow-2xl dark:bg-slate-900/90 dark:border-slate-800 rounded-2xl backdrop-blur-xl p-6 sm:p-8 transition-colors duration-200">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Masuk ke Sistem</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Masukkan username dan password Anda untuk melanjutkan.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/60 dark:border-rose-800/80 dark:text-rose-300 text-xs leading-relaxed">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username Anda"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-slate-950 dark:border-slate-700 dark:text-white dark:placeholder-slate-500 dark:focus:bg-slate-900 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-slate-950 dark:border-slate-700 dark:text-white dark:placeholder-slate-500 dark:focus:bg-slate-900 transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                <>
                  Masuk
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Footer Ringkas */}
      <footer className="py-4 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200/80 bg-white/40 dark:border-slate-900 dark:bg-slate-950/40 transition-colors duration-200">
        &copy; 2026 BumiAyu.
      </footer>

      {/* POPUP PANDUAN INSTALL PWA UNTUK IPHONE / IPAD (IOS) */}
      {showIosInstallModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="my-auto w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4 text-center animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 flex items-center justify-center text-emerald-600">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                Cara Pasang di iPhone / iPad
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Ikuti 3 langkah mudah berikut untuk memasang aplikasi BumiAyu di layar utama:
              </p>
            </div>

            <div className="space-y-3 text-left text-xs bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                  1
                </span>
                <span>
                  Ketuk tombol <strong>Bagikan (Share)</strong> ikon kotak dengan panah ke atas di bilah bawah browser Safari.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                  2
                </span>
                <span>
                  Gulir ke bawah dan pilih menu <strong>&quot;Tambah ke Layar Utama&quot;</strong> (<em>Add to Home Screen</em>).
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                  3
                </span>
                <span>
                  Ketuk tombol <strong>Tambah</strong> di pojok kanan atas. Aplikasi BumiAyu akan langsung muncul di layar HP Anda!
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosInstallModal(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-colors"
            >
              Mengerti, Tutup Panduan
            </button>
          </div>
        </div>
      )}

      {/* MODAL DIALOG FEEDBACK */}
      <CustomModalDialog
        config={modalDialog}
        onClose={() => {
          if (modalDialog?.onConfirm) modalDialog.onConfirm();
          setModalDialog(null);
        }}
      />
    </main>
  );
}
