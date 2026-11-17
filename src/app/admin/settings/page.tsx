'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Settings,
  Users,
  UserPlus,
  Edit,
  Save,
  Printer,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Eye,
  Shield,
  KeyRound,
  FileText,
  UserCheck,
  UserX,
  ExternalLink,
  Sliders,
  Check,
  Truck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export interface InvoiceTemplateConfig {
  companyName: string;
  companyTagline: string;
  companyAddress: string;
  companyPhone: string;
  documentTitle: string;
  paperSize: 'continuous_half_letter' | 'continuous_a4' | 'thermal_80mm';
  showItemSku: boolean;
  showDiscountCol: boolean;
  showItemNo: boolean;
  termsNotes: string;
  signerLeft: string;
  signerMiddle: string;
  signerRight: string;
}

export const DEFAULT_INVOICE_TEMPLATE: InvoiceTemplateConfig = {
  companyName: 'BUMIAYU DISTRIBUTOR',
  companyTagline: 'Distribusi & Grosir Produk Konsumsi',
  companyAddress: 'Jl. Raya Diponegoro No. 88, Bumiayu, Brebes, Jawa Tengah',
  companyPhone: 'WA / Telp: 0812-3456-7890',
  documentTitle: 'FAKTUR PENJUALAN',
  paperSize: 'continuous_half_letter',
  showItemSku: true,
  showDiscountCol: true,
  showItemNo: true,
  termsNotes: '1. Barang yang telah dibeli tidak dapat ditukar/dikembalikan tanpa persetujuan kantor.\n2. Pembayaran bilyet giro/cek baru sah jika dana sudah masuk ke rekening kami.\n3. Faktur asli ini merupakan bukti sah penagihan.',
  signerLeft: 'Penerima / Toko',
  signerMiddle: 'Supir / Pengirim',
  signerRight: 'Admin / Gudang',
};

interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  role: 'owner' | 'admin' | 'sales';
  phone?: string | null;
  is_active: boolean;
  created_at: string;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'users' | 'invoice' | 'desktop'>('users');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // --- TAB 1: USER MANAGEMENT ---
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Admin Profile Edit State
  const [adminName, setAdminName] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [savingAdminProfile, setSavingAdminProfile] = useState(false);

  // Sales Modals State
  const [isAddSalesModalOpen, setIsAddSalesModalOpen] = useState(false);
  const [newSalesForm, setNewSalesForm] = useState({
    username: '',
    name: '',
    password: '',
    phone: '',
  });
  const [savingNewSales, setSavingNewSales] = useState(false);

  const [editingSalesUser, setEditingSalesUser] = useState<UserProfile | null>(null);
  const [editSalesForm, setEditSalesForm] = useState({
    name: '',
    username: '',
    password: '',
    phone: '',
    is_active: true,
  });
  const [savingEditSales, setSavingEditSales] = useState(false);

  // --- TAB 2: INVOICE TEMPLATE ---
  const [templateConfig, setTemplateConfig] = useState<InvoiceTemplateConfig>(DEFAULT_INVOICE_TEMPLATE);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [previewPly, setPreviewPly] = useState<'white' | 'pink' | 'yellow'>('white');

  // --- TAB 3: DESKTOP APP ---
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Auth Initialization & Protection
  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      let activeUser = session?.user;
      if (!activeUser) {
        try {
          const savedUserStr = localStorage.getItem('bumiayu_auth_user');
          if (savedUserStr) {
            activeUser = JSON.parse(savedUserStr);
          }
        } catch (e) {
          console.error(e);
        }
      }

      if (!activeUser) {
        router.push('/');
        return;
      }

      setAdminUser(activeUser);
      setAdminName(activeUser.user_metadata?.full_name || (activeUser as any).full_name || 'Owner BumiAyu');
      setAdminUsername(activeUser.user_metadata?.username || (activeUser as any).username || 'admin');
      setAuthLoading(false);
      fetchUsers();
    }
    init();
  }, [router]);

  // Load Saved Invoice Template
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bumiayu_invoice_template');
      if (saved) {
        setTemplateConfig(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to parse saved invoice template', e);
    }
  }, []);

  // Fetch Users
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (res.ok && data.users) {
        setUsersList(data.users);
      } else {
        showToast(data.error || 'Gagal mengambil daftar pengguna', 'error');
      }
    } catch {
      showToast('Koneksi terputus saat mengambil pengguna', 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Capture PWA Install Prompt for Desktop
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Handler Update Admin Account
  const handleUpdateAdminProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUser) return;
    setSavingAdminProfile(true);
    try {
      const res = await fetch(`/api/admin/users/${adminUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: adminName,
          username: adminUsername,
          password: adminNewPassword.trim() ? adminNewPassword.trim() : undefined,
          admin_id: adminUser.id,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Profil akun Admin berhasil diperbarui!', 'success');
        setAdminNewPassword('');
        fetchUsers();
      } else {
        showToast(data.error || 'Gagal memperbarui profil admin', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan saat menyimpan profil', 'error');
    } finally {
      setSavingAdminProfile(false);
    }
  };

  // Handler Add Sales User
  const handleCreateSalesUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSalesForm.username.trim() || !newSalesForm.name.trim() || !newSalesForm.password.trim()) {
      showToast('Mohon lengkapi username, nama lengkap, dan password.', 'error');
      return;
    }
    setSavingNewSales(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newSalesForm.username,
          name: newSalesForm.name,
          password: newSalesForm.password,
          phone: newSalesForm.phone,
          role: 'sales',
          admin_id: adminUser?.id,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`User sales "${newSalesForm.name}" berhasil ditambahkan!`, 'success');
        setNewSalesForm({ username: '', name: '', password: '', phone: '' });
        setIsAddSalesModalOpen(false);
        fetchUsers();
      } else {
        showToast(data.error || 'Gagal menambahkan user sales', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan saat menambahkan sales', 'error');
    } finally {
      setSavingNewSales(false);
    }
  };

  // Handler Edit Sales User
  const handleOpenEditSales = (user: UserProfile) => {
    setEditingSalesUser(user);
    setEditSalesForm({
      name: user.full_name,
      username: user.username,
      password: '',
      phone: user.phone || '',
      is_active: user.is_active,
    });
  };

  const handleSaveEditSales = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSalesUser) return;
    setSavingEditSales(true);
    try {
      const res = await fetch(`/api/admin/users/${editingSalesUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editSalesForm.name,
          username: editSalesForm.username,
          password: editSalesForm.password.trim() ? editSalesForm.password.trim() : undefined,
          phone: editSalesForm.phone,
          is_active: editSalesForm.is_active,
          admin_id: adminUser?.id,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Data sales "${editSalesForm.name}" berhasil diperbarui!`, 'success');
        setEditingSalesUser(null);
        fetchUsers();
      } else {
        showToast(data.error || 'Gagal mengedit sales', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan saat mengedit sales', 'error');
    } finally {
      setSavingEditSales(false);
    }
  };

  // Save Invoice Template
  const handleSaveTemplate = () => {
    setSavingTemplate(true);
    try {
      localStorage.setItem('bumiayu_invoice_template', JSON.stringify(templateConfig));
      showToast('Template Faktur berhasil disimpan!', 'success');
    } catch {
      showToast('Gagal menyimpan template ke browser storage', 'error');
    } finally {
      setTimeout(() => setSavingTemplate(false), 500);
    }
  };

  const handleResetTemplate = () => {
    if (confirm('Kembalikan template faktur ke format standar default?')) {
      setTemplateConfig(DEFAULT_INVOICE_TEMPLATE);
      localStorage.setItem('bumiayu_invoice_template', JSON.stringify(DEFAULT_INVOICE_TEMPLATE));
      showToast('Template dikembalikan ke format standar!', 'success');
    }
  };

  // Trigger PWA Install
  const handleInstallPWA = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        showToast('Aplikasi desktop berhasil diinstal!', 'success');
      }
      setInstallPrompt(null);
    } else {
      showToast('Gunakan ikon Install di address bar browser Anda (Chrome / Edge).', 'success');
    }
  };

  // Download Windows .URL Shortcut
  const handleDownloadWindowsShortcut = () => {
    const origin = window.location.origin;
    const content = `[InternetShortcut]\nURL=${origin}/admin\nIconIndex=0\n`;
    const blob = new Blob([content], { type: 'application/internet-shortcut' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'BumiAyu-Distributor-Admin.url';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Shortcut Desktop Windows berhasil diunduh!', 'success');
  };

  // Download Mac .WEBLOC Shortcut
  const handleDownloadMacShortcut = () => {
    const origin = window.location.origin;
    const content = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n\t<key>URL</key>\n\t<string>${origin}/admin</string>\n</dict>\n</plist>`;
    const blob = new Blob([content], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'BumiAyu-Distributor-Admin.webloc';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Shortcut Desktop Mac (.webloc) berhasil diunduh!', 'success');
  };

  const salesUsers = usersList.filter((u) => u.role === 'sales');
  const adminUsers = usersList.filter((u) => u.role === 'owner' || u.role === 'admin');

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-16">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 border transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header Admin - Matching Main Admin Dashboard */}
      <header className="sticky top-0 z-40 px-3 sm:px-6 py-2.5 sm:py-3.5 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link
            href="/admin"
            className="h-8 px-2.5 sm:px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-all text-slate-700 dark:text-slate-300 cursor-pointer"
            title="Kembali ke Dashboard Admin"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kembali</span>
          </Link>

          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-600/20 shrink-0">
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>

          <div>
            <h1 className="text-sm sm:text-base font-extrabold tracking-tight">BumiAyu | Pengaturan Sistem</h1>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Admin: <span className="font-semibold text-emerald-600">{adminName || 'Owner'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono font-semibold">
            {adminName || 'Admin'}
          </span>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Navigation Tabs - Full Width with Space Between */}
        <div className="w-full flex items-center justify-between border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1 gap-1 sm:gap-2 no-scrollbar">
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 border-b-2 whitespace-nowrap transition-all flex-1 min-w-max px-2.5 sm:px-3 text-center cursor-pointer ${
              activeTab === 'users'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Profil Admin & Pengguna Sales</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
              {usersList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('invoice')}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 border-b-2 whitespace-nowrap transition-all flex-1 min-w-max px-2.5 sm:px-3 text-center cursor-pointer ${
              activeTab === 'invoice'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span>Desain Template Cetak Faktur</span>
          </button>

          <button
            onClick={() => setActiveTab('desktop')}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 border-b-2 whitespace-nowrap transition-all flex-1 min-w-max px-2.5 sm:px-3 text-center cursor-pointer ${
              activeTab === 'desktop'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Laptop className="w-4 h-4 shrink-0" />
            <span>Download Aplikasi Desktop</span>
          </button>
        </div>

        {/* TAB 1: USERS & PROFILE MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* 1. Pengaturan Akun Admin Sendiri */}
            <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Akun Administrator / Owner</h2>
                    <p className="text-xs text-slate-500">Ganti nama tampilan, username, atau perbarui kata sandi admin</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800">
                  Owner Role
                </span>
              </div>

              <form onSubmit={handleUpdateAdminProfile} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold block mb-1 text-slate-700 dark:text-slate-300">
                    Nama Admin Lengkap *
                  </label>
                  <input
                    type="text"
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Nama Admin"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1 text-slate-700 dark:text-slate-300">
                    Username Admin *
                  </label>
                  <input
                    type="text"
                    required
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                    placeholder="username admin"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1 text-slate-700 dark:text-slate-300">
                    Password Baru (Kosongkan bila tidak ganti)
                  </label>
                  <input
                    type="password"
                    value={adminNewPassword}
                    onChange={(e) => setAdminNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="md:col-span-3 flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingAdminProfile}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingAdminProfile ? 'Menyimpan Akun Admin...' : 'Simpan Perubahan Akun Admin'}
                  </button>
                </div>
              </form>
            </div>

            {/* 2. Manajemen Pengguna Sales Lapangan */}
            <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Daftar Pengguna Sales Lapangan</h2>
                    <p className="text-xs text-slate-500">Akun sales yang menggunakan aplikasi PWA mobile untuk input order toko</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchUsers}
                    disabled={loadingUsers}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
                    title="Segarkan data pengguna"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => setIsAddSalesModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Tambah Sales Baru</span>
                  </button>
                </div>
              </div>

              {/* Tabel Pengguna Sales */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">Nama Sales</th>
                      <th className="p-3">Username</th>
                      <th className="p-3">No. WhatsApp</th>
                      <th className="p-3">Status Akun</th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {loadingUsers ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-500">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                          Memuat data pengguna...
                        </td>
                      </tr>
                    ) : salesUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-500">
                          Belum ada pengguna sales lapangan terdaftar. Klik <strong>+ Tambah Sales Baru</strong> di atas.
                        </td>
                      </tr>
                    ) : (
                      salesUsers.map((sales) => (
                        <tr key={sales.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="p-3 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300">
                              {sales.full_name?.charAt(0).toUpperCase() || 'S'}
                            </div>
                            <span>{sales.full_name}</span>
                          </td>
                          <td className="p-3 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{sales.username}</td>
                          <td className="p-3 font-mono">{sales.phone || '-'}</td>
                          <td className="p-3">
                            {sales.is_active ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <UserCheck className="w-3 h-3" />
                                Aktif
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                <UserX className="w-3 h-3" />
                                Nonaktif
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleOpenEditSales(sales)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold flex items-center gap-1 ml-auto cursor-pointer"
                            >
                              <Edit className="w-3 h-3 text-amber-500" />
                              <span>Ubah Akun</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INVOICE TEMPLATE */}
        {activeTab === 'invoice' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Kolom Kiri: Form Konfigurasi Template */}
            <div className="lg:col-span-6 space-y-4">
              <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Parameter Template Faktur Penjualan
                    </h2>
                  </div>
                  <button
                    onClick={handleResetTemplate}
                    type="button"
                    className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-semibold cursor-pointer"
                  >
                    Reset ke Default
                  </button>
                </div>

                <div className="space-y-3.5 text-xs">
                  {/* Judul & Dokumen */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                        Nama Perusahaan / Usaha *
                      </label>
                      <input
                        type="text"
                        value={templateConfig.companyName}
                        onChange={(e) => setTemplateConfig({ ...templateConfig, companyName: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl font-bold uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                        Judul Dokumen Nota *
                      </label>
                      <input
                        type="text"
                        value={templateConfig.documentTitle}
                        onChange={(e) => setTemplateConfig({ ...templateConfig, documentTitle: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl font-bold uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                      Tagline / Sub-header Usaha
                    </label>
                    <input
                      type="text"
                      value={templateConfig.companyTagline}
                      onChange={(e) => setTemplateConfig({ ...templateConfig, companyTagline: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                        Alamat Perusahaan
                      </label>
                      <input
                        type="text"
                        value={templateConfig.companyAddress}
                        onChange={(e) => setTemplateConfig({ ...templateConfig, companyAddress: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                        No. Telepon / WhatsApp
                      </label>
                      <input
                        type="text"
                        value={templateConfig.companyPhone}
                        onChange={(e) => setTemplateConfig({ ...templateConfig, companyPhone: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Format Kertas Continuous */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                    <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                      Ukuran Kertas Printer Continuous Form
                    </label>
                    <select
                      value={templateConfig.paperSize}
                      onChange={(e) => setTemplateConfig({ ...templateConfig, paperSize: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="continuous_half_letter">Continuous Form 9.5 x 5.5 inch (Epson LX-310 1/2 Wartel/Letter)</option>
                      <option value="continuous_a4">Continuous Form 9.5 x 11 inch (Full Page A4)</option>
                      <option value="thermal_80mm">Kertas Kasir Thermal 80mm</option>
                    </select>
                  </div>

                  {/* Kolom Tabel Toggles */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                    <label className="font-bold block mb-2 text-slate-700 dark:text-slate-300">
                      Kolom Tabel Produk yang Ditampilkan
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <label className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer text-slate-800 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={templateConfig.showItemNo}
                          onChange={(e) => setTemplateConfig({ ...templateConfig, showItemNo: e.target.checked })}
                          className="rounded text-emerald-600 focus:ring-0"
                        />
                        <span>No. Urut</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer text-slate-800 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={templateConfig.showItemSku}
                          onChange={(e) => setTemplateConfig({ ...templateConfig, showItemSku: e.target.checked })}
                          className="rounded text-emerald-600 focus:ring-0"
                        />
                        <span>Kode SKU</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer text-slate-800 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={templateConfig.showDiscountCol}
                          onChange={(e) => setTemplateConfig({ ...templateConfig, showDiscountCol: e.target.checked })}
                          className="rounded text-emerald-600 focus:ring-0"
                        />
                        <span>Diskon (%)</span>
                      </label>
                    </div>
                  </div>

                  {/* Syarat Ketentuan Nota */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                    <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                      Catatan & Syarat Ketentuan (Footer Nota)
                    </label>
                    <textarea
                      rows={3}
                      value={templateConfig.termsNotes}
                      onChange={(e) => setTemplateConfig({ ...templateConfig, termsNotes: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Format Tanda Tangan */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                    <label className="font-bold block mb-2 text-slate-700 dark:text-slate-300">
                      Label Kolom Tanda Tangan (3 Kolom)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-0.5">Kiri</span>
                        <input
                          type="text"
                          value={templateConfig.signerLeft}
                          onChange={(e) => setTemplateConfig({ ...templateConfig, signerLeft: e.target.value })}
                          className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-0.5">Tengah</span>
                        <input
                          type="text"
                          value={templateConfig.signerMiddle}
                          onChange={(e) => setTemplateConfig({ ...templateConfig, signerMiddle: e.target.value })}
                          className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-0.5">Kanan</span>
                        <input
                          type="text"
                          value={templateConfig.signerRight}
                          onChange={(e) => setTemplateConfig({ ...templateConfig, signerRight: e.target.value })}
                          className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Simpan Template Button */}
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveTemplate}
                      disabled={savingTemplate}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {savingTemplate ? 'Menyimpan Template...' : 'Simpan Konfigurasi Template Faktur'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Kolom Kanan: Live Interactive Dot Matrix Preview */}
            <div className="lg:col-span-6 space-y-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Live Preview Cetak Dot Matrix 3-Ply
                    </h3>
                  </div>

                  {/* Switch Ply Color Preview */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPreviewPly('white')}
                      className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                        previewPly === 'white'
                          ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                          : 'bg-transparent text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      Ply 1 (Asli)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewPly('pink')}
                      className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                        previewPly === 'pink'
                          ? 'bg-pink-100 text-pink-900 border-pink-400 font-extrabold'
                          : 'bg-transparent text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      Ply 2 (Toko)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewPly('yellow')}
                      className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                        previewPly === 'yellow'
                          ? 'bg-amber-100 text-amber-900 border-amber-400 font-extrabold'
                          : 'bg-transparent text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      Ply 3 (Gudang)
                    </button>
                  </div>
                </div>

                {/* Simulasi Kertas Continuous Dot Matrix */}
                <div
                  className={`p-4 rounded-lg font-mono text-[11px] leading-tight shadow-md border overflow-x-auto ${
                    previewPly === 'white'
                      ? 'bg-[#fbfbf8] text-slate-900 border-slate-300'
                      : previewPly === 'pink'
                      ? 'bg-[#ffeef2] text-slate-900 border-pink-300'
                      : 'bg-[#fffde6] text-slate-900 border-amber-300'
                  }`}
                  style={{ fontFamily: 'Courier New, Courier, monospace' }}
                >
                  {/* Header Nota */}
                  <div className="flex items-start justify-between border-b border-dashed border-slate-400 pb-2 mb-2">
                    <div>
                      <h4 className="text-xs font-black tracking-wider uppercase">{templateConfig.companyName}</h4>
                      <p className="text-[10px]">{templateConfig.companyTagline}</p>
                      <p className="text-[9px] text-slate-600">{templateConfig.companyAddress}</p>
                      <p className="text-[9px] text-slate-600">{templateConfig.companyPhone}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black tracking-widest text-emerald-800 uppercase">
                        {templateConfig.documentTitle}
                      </div>
                      <div className="text-[10px] font-bold">FAK-202611-0001</div>
                      <div className="text-[9px]">Tgl: 17/11/2026 | JT: 24/11/2026</div>
                      <div className="text-[9px] font-bold text-emerald-700">
                        {previewPly === 'white' ? 'LEMBAR ASLI (PENAGIHAN)' : previewPly === 'pink' ? 'SALINAN 2 (ARSIP TOKO)' : 'SALINAN 3 (PENGIRIMAN/SUPIR)'}
                      </div>
                    </div>
                  </div>

                  {/* Info Pelanggan */}
                  <div className="flex justify-between text-[10px] mb-2 border-b border-dashed border-slate-300 pb-1.5">
                    <div>
                      <span className="font-bold">Kepada Yth:</span> TOKO BAROKAH JAYA (TK-003)
                      <div className="text-slate-600">Jl. Pagojengan RT 02/01, Bumiayu | Telp: 0812-9988-7766</div>
                    </div>
                    <div className="text-right">
                      <div>Sales: <strong>Budi Santoso</strong></div>
                      <div>Syarat Bayar: <strong>TOP 7 Hari</strong></div>
                    </div>
                  </div>

                  {/* Tabel Preview */}
                  <table className="w-full text-left border-collapse border-t border-b border-black mb-2 text-[10px]">
                    <thead>
                      <tr className="border-b border-black font-bold uppercase">
                        {templateConfig.showItemNo && <th className="py-1 w-6">No</th>}
                        <th className="py-1">Nama Barang {templateConfig.showItemSku && '/ SKU'}</th>
                        <th className="py-1 text-center">Satuan</th>
                        <th className="py-1 text-center">Qty</th>
                        <th className="py-1 text-right">Harga (Rp)</th>
                        {templateConfig.showDiscountCol && <th className="py-1 text-right">Disc %</th>}
                        <th className="py-1 text-right">Subtotal (Rp)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dashed divide-slate-300">
                      <tr>
                        {templateConfig.showItemNo && <td className="py-1">1</td>}
                        <td className="py-1">
                          <span className="font-bold">Body Fit Day Wing 23cm</span>
                          {templateConfig.showItemSku && <span className="text-[9px] block text-slate-600 font-mono">CHR-DAY-WING-23</span>}
                        </td>
                        <td className="py-1 text-center">KTN</td>
                        <td className="py-1 text-center font-bold">3</td>
                        <td className="py-1 text-right">81.000</td>
                        {templateConfig.showDiscountCol && <td className="py-1 text-right text-emerald-800 font-bold">5%</td>}
                        <td className="py-1 text-right font-bold">230.850</td>
                      </tr>
                      <tr>
                        {templateConfig.showItemNo && <td className="py-1">2</td>}
                        <td className="py-1">
                          <span className="font-bold">Safe Night 35cm Wing</span>
                          {templateConfig.showItemSku && <span className="text-[9px] block text-slate-600 font-mono">CHR-NIGHT-35</span>}
                        </td>
                        <td className="py-1 text-center">BD</td>
                        <td className="py-1 text-center font-bold">2</td>
                        <td className="py-1 text-right">12.500</td>
                        {templateConfig.showDiscountCol && <td className="py-1 text-right">0%</td>}
                        <td className="py-1 text-right font-bold">25.000</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Summary & Footer */}
                  <div className="flex items-start justify-between gap-4 pt-1 mb-3">
                    <div className="max-w-[60%] text-[9px] text-slate-700 whitespace-pre-line leading-relaxed">
                      <strong>Syarat & Ketentuan:</strong>
                      <br />
                      {templateConfig.termsNotes}
                    </div>
                    <div className="text-right min-w-[35%]">
                      <div className="text-[10px]">Total Item: <strong>2 Macam (5 Satuan)</strong></div>
                      <div className="text-xs font-black pt-1 border-t border-black">
                        TOTAL: Rp 255.850
                      </div>
                    </div>
                  </div>

                  {/* Tanda Tangan */}
                  <div className="grid grid-cols-3 gap-4 text-center text-[10px] pt-3 border-t border-dashed border-slate-400">
                    <div>
                      <p className="font-bold">{templateConfig.signerLeft}</p>
                      <div className="h-9"></div>
                      <p className="border-t border-dotted border-black pt-0.5">(..........................)</p>
                    </div>
                    <div>
                      <p className="font-bold">{templateConfig.signerMiddle}</p>
                      <div className="h-9"></div>
                      <p className="border-t border-dotted border-black pt-0.5">(..........................)</p>
                    </div>
                    <div>
                      <p className="font-bold">{templateConfig.signerRight}</p>
                      <div className="h-9"></div>
                      <p className="border-t border-dotted border-black pt-0.5">(..........................)</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                  <span>* Ukuran kertas aktif: <strong className="text-slate-800 dark:text-slate-200">{templateConfig.paperSize}</strong></span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Kompatibel printer dot-matrix Epson LX-310 / LQ-310</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DESKTOP APP DOWNLOAD */}
        {activeTab === 'desktop' && (
          <div className="space-y-6">
            <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center gap-3 mb-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <Laptop className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Instalasi & Download Aplikasi Desktop BumiAyu
                  </h2>
                  <p className="text-xs text-slate-500">
                    Jalankan aplikasi BumiAyu Distributor di Windows PC atau Mac dengan performa native tanpa ribet
                  </p>
                </div>
              </div>

              {/* Status PWA */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                      Aplikasi Siap Diinstal (PWA Desktop Ready)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Mendukung operasional offline lokal, print dot matrix LX-310 langsung dari desktop, dan sinkronisasi otomatis.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleInstallPWA}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <Laptop className="w-4 h-4" />
                  <span>{isInstalled ? 'Buka Aplikasi Desktop' : 'Instal App ke Komputer Sekarang'}</span>
                </button>
              </div>

              {/* Download Shortcuts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Windows Shortcut */}
                <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                        <span className="text-sky-500">❖</span> Windows PC (10 / 11)
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-semibold">
                        .URL Shortcut
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-4">
                      Unduh jalan pintas desktop Windows untuk membuka portal Admin secara langsung dari Desktop atau Start Menu.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadWindowsShortcut}
                    className="w-full py-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Download Shortcut Windows (.url)</span>
                  </button>
                </div>

                {/* macOS Shortcut */}
                <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                        <span className="text-amber-500"></span> Apple macOS
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-semibold">
                        .WEBLOC Shortcut
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-4">
                      Unduh file webloc native macOS yang dapat Anda letakkan di Dock atau Applications folder Mac Anda.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadMacShortcut}
                    className="w-full py-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Download Shortcut Mac (.webloc)</span>
                  </button>
                </div>
              </div>

              {/* Panduan Instalasi Browser */}
              <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Cara Instal Melalui Google Chrome / Microsoft Edge di Laptop/PC:
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-400 pl-1">
                  <li>Buka website ini menggunakan <strong>Google Chrome</strong> atau <strong>Microsoft Edge</strong>.</li>
                  <li>Perhatikan ikon <strong>Instal Aplikasi (gambar komputer/tanda panah ke bawah)</strong> di ujung kanan address bar browser Anda.</li>
                  <li>Klik tombol <strong>Instal</strong>, aplikasi akan langsung terbuka sebagai program desktop mandiri tanpa address bar browser.</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Tambah Sales Baru */}
      {isAddSalesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold">Tambah Pengguna Sales Lapangan</h3>
              </div>
            </div>

            <form onSubmit={handleCreateSalesUser} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                  Nama Lengkap Sales *
                </label>
                <input
                  type="text"
                  required
                  value={newSalesForm.name}
                  onChange={(e) => setNewSalesForm({ ...newSalesForm, name: e.target.value })}
                  placeholder="cth: Budi Santoso"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                  Username Login *
                </label>
                <input
                  type="text"
                  required
                  value={newSalesForm.username}
                  onChange={(e) =>
                    setNewSalesForm({
                      ...newSalesForm,
                      username: e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''),
                    })
                  }
                  placeholder="cth: budi_sales"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                  Password Baru * (Min. 6 Karakter)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newSalesForm.password}
                  onChange={(e) => setNewSalesForm({ ...newSalesForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                  No. WhatsApp (Opsional)
                </label>
                <input
                  type="text"
                  value={newSalesForm.phone}
                  onChange={(e) => setNewSalesForm({ ...newSalesForm, phone: e.target.value })}
                  placeholder="cth: 08123456789"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Action Buttons: Cancel must be RED */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddSalesModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingNewSales}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingNewSales ? 'Menyimpan...' : 'Simpan User Sales'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Ubah Sales */}
      {editingSalesUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold">Ubah Akun Sales Lapangan</h3>
              </div>
            </div>

            <form onSubmit={handleSaveEditSales} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                  Nama Lengkap Sales *
                </label>
                <input
                  type="text"
                  required
                  value={editSalesForm.name}
                  onChange={(e) => setEditSalesForm({ ...editSalesForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                  Username Login *
                </label>
                <input
                  type="text"
                  required
                  value={editSalesForm.username}
                  onChange={(e) =>
                    setEditSalesForm({
                      ...editSalesForm,
                      username: e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''),
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                  Password Baru (Kosongkan jika tidak diganti)
                </label>
                <input
                  type="password"
                  value={editSalesForm.password}
                  onChange={(e) => setEditSalesForm({ ...editSalesForm, password: e.target.value })}
                  placeholder="Ketik password baru jika ingin mereset..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                  No. WhatsApp
                </label>
                <input
                  type="text"
                  value={editSalesForm.phone}
                  onChange={(e) => setEditSalesForm({ ...editSalesForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                  Status Keaktifan Akun
                </label>
                <select
                  value={editSalesForm.is_active ? 'active' : 'inactive'}
                  onChange={(e) => setEditSalesForm({ ...editSalesForm, is_active: e.target.value === 'active' })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="active">Aktif (Dapat Login & Buat Pesanan)</option>
                  <option value="inactive">Nonaktif (Akses Diblokir)</option>
                </select>
              </div>

              {/* Action Buttons: Cancel must be RED */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingSalesUser(null)}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingEditSales}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingEditSales ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
