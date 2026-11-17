'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  X,
  Layers,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import ContinuousFormInvoice, { InvoiceItem, angkaTerbilang } from '@/components/ContinuousFormInvoice';

export interface InvoiceTemplateConfig {
  documentTitle: string;
  subHeaderCode: string;
  departmentCode: string;
  paperSize: 'continuous_half_letter' | 'continuous_a4' | 'thermal_80mm';
  showItemSku: boolean;
  showDiscountCol: boolean;
  showItemNo: boolean;
  termsNotes: string;
  signerLeft: string;
  signerRight: string;
  itemsPerPage: number;
}

export const DEFAULT_INVOICE_TEMPLATE: InvoiceTemplateConfig = {
  documentTitle: 'FAKTUR PENJUALAN',
  subHeaderCode: '168',
  departmentCode: 'UTM',
  paperSize: 'continuous_half_letter',
  showItemSku: true,
  showDiscountCol: true,
  showItemNo: true,
  termsNotes: '',
  signerLeft: 'Hormat Kami',
  signerRight: 'Penerima',
  itemsPerPage: 7,
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

  const [activeTab, setActiveTab] = useState<'users' | 'invoice' | 'desktop'>('invoice');
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
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewSampleType, setPreviewSampleType] = useState<'single_page' | 'multi_page'>('multi_page');
  const [previewPaperColor, setPreviewPaperColor] = useState<'white' | 'pink' | 'yellow'>('white');
  const [inventoryList, setInventoryList] = useState<any[]>([]);

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
      fetchInventory();
    }
    init();
  }, [router]);

  // Load Saved Invoice Template
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bumiayu_invoice_template');
      if (saved) {
        setTemplateConfig((prev) => ({ ...prev, ...JSON.parse(saved) }));
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

  // Fetch Inventory for Live Preview random goods
  const fetchInventory = async () => {
    try {
      const res = await fetch('/api/master/products');
      const data = await res.json();
      if (res.ok && data.products) {
        setInventoryList(data.products);
      }
    } catch (e) {
      console.error(e);
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

  // Sample items for Live Preview (matching Foto 1 & Foto 2)
  const sampleItems: InvoiceItem[] = useMemo(() => {
    if (previewSampleType === 'single_page') {
      return [
        { name: 'CH NIGHT 29 WING 9 (48)', sku: 'SC29W9', unit_name: 'PCS', quantity: 5, unit_price: 9320, total_price: 46600, discount_percent: 0 },
        { name: 'CH NIGHT 35 WING 18 (24)', sku: 'SC35W18', unit_name: 'PCS', quantity: 3, unit_price: 25432, total_price: 76296, discount_percent: 0 },
        { name: 'VAPE JMB TANPA ASAP (60)', sku: 'CTA', unit_name: 'KTN', quantity: 1, unit_price: 273000, total_price: 273000, discount_percent: 0 },
      ];
    }

    // 12 items for multi-page demonstration (exceeds itemsPerPage = 7)
    return [
      { name: 'CH SAFE NIGHT 42 G 7 (30)', sku: 'PS7', unit_name: 'PCS', quantity: 2, unit_price: 22220, total_price: 44440, discount_percent: 0 },
      { name: 'C COOLING 23 WING 7 (48)', sku: 'SW7', unit_name: 'PCS', quantity: 6, unit_price: 7600, total_price: 45600, discount_percent: 0 },
      { name: 'COOLING 29 WING 10 (24)', sku: 'SW10', unit_name: 'PCS', quantity: 3, unit_price: 16291, total_price: 48873, discount_percent: 0 },
      { name: 'C COOL NIGHT 35 W 8 (24)', sku: 'SW8', unit_name: 'PCS', quantity: 3, unit_price: 16291, total_price: 48873, discount_percent: 0 },
      { name: 'C COOL FR 23 WING 15 (24)', sku: 'SW15', unit_name: 'PCS', quantity: 3, unit_price: 16300, total_price: 48900, discount_percent: 0 },
      { name: 'C COOLING 23 NON 17 (24)', sku: 'SN17', unit_name: 'PCS', quantity: 3, unit_price: 16300, total_price: 48900, discount_percent: 0 },
      { name: 'CH NIGHT 29 WING 2 (240)', sku: 'NW2', unit_name: 'RTG', quantity: 12, unit_price: 25750, total_price: 309000, discount_percent: 0 },
      // Lanjutan ke Halaman 2:
      { name: 'CH NIGHT 35 WING 2 (240)', sku: 'SW2', unit_name: 'RTG', quantity: 12, unit_price: 30900, total_price: 370800, discount_percent: 0 },
      { name: 'ZHINZUI 90 SAKURA', sku: 'DS', unit_name: 'PCS', quantity: 36, unit_price: 4690, total_price: 168840, discount_percent: 0 },
      { name: 'ZHINZUI 90 KHENZO', sku: 'OKH', unit_name: 'PCS', quantity: 36, unit_price: 4690, total_price: 168840, discount_percent: 0 },
      { name: 'ZINZUI SZBUN KIRAI (144)', sku: 'OK', unit_name: 'PCS', quantity: 72, unit_price: 4690, total_price: 337680, discount_percent: 0 },
      { name: 'SB HARMONI ORANGE (72)', sku: 'DO', unit_name: 'PCS', quantity: 24, unit_price: 2535, total_price: 60840, discount_percent: 0 },
    ];
  }, [previewSampleType]);

  const sampleGrandTotal = sampleItems.reduce((sum, it) => sum + it.total_price, 0);

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

        {/* =================================================================== */}
        {/* TAB 1: INVOICE TEMPLATE DESIGNER                                    */}
        {/* =================================================================== */}
        {activeTab === 'invoice' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Kolom Kiri: Form Konfigurasi Template */}
            <div className="lg:col-span-7 space-y-4">
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

                <div className="space-y-4 text-xs">
                  {/* Judul & Kode Header (Sesuai Foto 1) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                        Judul Dokumen Nota (Kiri Atas) *
                      </label>
                      <input
                        type="text"
                        value={templateConfig.documentTitle}
                        onChange={(e) => setTemplateConfig({ ...templateConfig, documentTitle: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl font-bold uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="cth: FAKTUR PENJUALAN"
                      />
                    </div>
                    <div>
                      <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                        Kode Sub-Header
                      </label>
                      <input
                        type="text"
                        value={templateConfig.subHeaderCode}
                        onChange={(e) => setTemplateConfig({ ...templateConfig, subHeaderCode: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl font-bold uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="cth: 168"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                        Kode Departemen (Kanan Atas)
                      </label>
                      <input
                        type="text"
                        value={templateConfig.departmentCode}
                        onChange={(e) => setTemplateConfig({ ...templateConfig, departmentCode: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl font-mono uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="cth: UTM"
                      />
                    </div>
                    <div>
                      <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                        Maksimal Baris Item / Halaman
                      </label>
                      <input
                        type="number"
                        min="4"
                        max="20"
                        value={templateConfig.itemsPerPage || 7}
                        onChange={(e) => setTemplateConfig({ ...templateConfig, itemsPerPage: Number(e.target.value) || 7 })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <p className="text-[10px] text-slate-500 mt-0.5">Jika melebihi, otomatis lanjut ke halaman berikutnya (Foto 2)</p>
                    </div>
                  </div>

                  {/* Format Kertas Continuous */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                    <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                      Ukuran Kertas Printer Continuous Form Dot-Matrix
                    </label>
                    <select
                      value={templateConfig.paperSize}
                      onChange={(e) => setTemplateConfig({ ...templateConfig, paperSize: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="continuous_half_letter">Continuous Form 9.5 x 5.5 inch (Epson LX-310 1/2 Letter/Wartel)</option>
                      <option value="continuous_a4">Continuous Form 9.5 x 11 inch (Full Page A4)</option>
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
                        <span>Kode Item (SKU)</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer text-slate-800 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={templateConfig.showDiscountCol}
                          onChange={(e) => setTemplateConfig({ ...templateConfig, showDiscountCol: e.target.checked })}
                          className="rounded text-emerald-600 focus:ring-0"
                        />
                        <span>Potongan (Pot)</span>
                      </label>
                    </div>
                  </div>

                  {/* Syarat Ketentuan Nota (Foto 4 Rule: Kosong tidak mencetak judul) */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold block text-slate-700 dark:text-slate-300">
                        Catatan & Syarat Ketentuan (Footer Nota)
                      </label>
                      <span className="text-[10px] text-slate-500 italic">
                        *Kosongkan bila tidak ingin mencetak syarat &amp; ketentuan (Foto 4)
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      value={templateConfig.termsNotes}
                      onChange={(e) => setTemplateConfig({ ...templateConfig, termsNotes: e.target.value })}
                      placeholder="Kosongkan agar tidak muncul sama sekali di nota..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Format Tanda Tangan: 2 Kolom Saja (Foto 1 & 2) */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                    <label className="font-bold block mb-2 text-slate-700 dark:text-slate-300">
                      Label Kolom Tanda Tangan (2 Kolom: Pengirim & Penerima)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-0.5">Kolom Kiri</span>
                        <input
                          type="text"
                          value={templateConfig.signerLeft}
                          onChange={(e) => setTemplateConfig({ ...templateConfig, signerLeft: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-center font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-0.5">Kolom Kanan</span>
                        <input
                          type="text"
                          value={templateConfig.signerRight}
                          onChange={(e) => setTemplateConfig({ ...templateConfig, signerRight: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-center font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tombol Simpan & Tombol Pop-up Preview */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setIsPreviewModalOpen(true)}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-black text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Eye className="w-4 h-4 text-amber-400" />
                      <span>Buka Pop-up Live Preview (Rasio Riil 9.5 x 5.5")</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveTemplate}
                      disabled={savingTemplate}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {savingTemplate ? 'Menyimpan...' : 'Simpan Template Faktur'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Kolom Kanan: Card Pemicu Preview Pop-Up & Penjelasan Teknis */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                      Standar Cetak Faktur Dot-Matrix
                    </h3>
                    <p className="text-xs text-slate-500">Kertas Continuous 3-Ply NCR (Epson LX-310)</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" />
                      1 Dokumen untuk 3 Lembar Sekaligus (Foto 3)
                    </div>
                    <p className="text-[11px]">
                      Kertas continuous NCR 3-ply tercetak sekaligus dengan 1 kali ketukan jarum pita. Sistem tidak perlu mencetak 3 kali terpisah, sehingga tidak membebani jarum dan pita printer.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" />
                      Paging Otomatis &amp; Header Minimal (Foto 2)
                    </div>
                    <p className="text-[11px]">
                      Jika pesanan melebihi batas {templateConfig.itemsPerPage || 7} item, halaman kedua tidak lagi membuang ruang untuk kop/alamat lengkap, melainkan langsung melanjutkan tabel produk dengan header minimal 1 baris.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" />
                      Tanda Tangan Hormat Kami &amp; Penerima (Foto 1)
                    </div>
                    <p className="text-[11px]">
                      Hanya menampilkan 2 pihak (pengirim dan penerima toko) dengan penulisan terbilang rupiah di footer nota.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(true)}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span>Buka Live Preview Pop-up Sekarang</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: PROFIL ADMIN & USER MANAGEMENT                               */}
        {/* =================================================================== */}
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

        {/* =================================================================== */}
        {/* TAB 3: DESKTOP APP DOWNLOAD                                         */}
        {/* =================================================================== */}
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

      {/* =================================================================== */}
      {/* POP-UP MODAL: LIVE PREVIEW FAKTUR (RASIO UKURAN KERTAS RIIL)       */}
      {/* =================================================================== */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto flex items-center justify-center">
          <div className="my-auto w-full max-w-5xl bg-slate-900 text-white rounded-3xl border border-slate-700 shadow-2xl p-4 sm:p-6 space-y-4 max-h-[96vh] flex flex-col">
            {/* Modal Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white">
                    Live Preview Faktur Dot-Matrix (Rasio Riil 9.5 x 5.5")
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Mensimulasikan cetakan printer Epson LX-310 pada kertas continuous form 3-ply
                  </p>
                </div>
              </div>

              {/* Controls bar */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Switch Data Sampel */}
                <div className="flex items-center p-1 bg-slate-800 rounded-xl border border-slate-700 text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewSampleType('single_page')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      previewSampleType === 'single_page'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    1 Halaman (3 Item)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewSampleType('multi_page')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      previewSampleType === 'multi_page'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    2 Halaman (12 Item)
                  </button>
                </div>

                {/* Switch Warna Kertas NCR */}
                <div className="flex items-center p-1 bg-slate-800 rounded-xl border border-slate-700 text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewPaperColor('white')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                      previewPaperColor === 'white'
                        ? 'bg-white text-slate-900 font-extrabold'
                        : 'text-slate-400'
                    }`}
                  >
                    Putih (Asli)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewPaperColor('pink')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                      previewPaperColor === 'pink'
                        ? 'bg-pink-100 text-pink-900 font-extrabold'
                        : 'text-slate-400'
                    }`}
                  >
                    Merah Muda
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewPaperColor('yellow')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                      previewPaperColor === 'yellow'
                        ? 'bg-amber-100 text-amber-900 font-extrabold'
                        : 'text-slate-400'
                    }`}
                  >
                    Kuning
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer ml-auto"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Realistic Continuous Tractor Feed Paper Container */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-6">
              {/* Paper Visualizer with Sprocket Holes */}
              <div
                className={`w-full max-w-4xl mx-auto rounded-xl p-4 sm:p-6 shadow-2xl border transition-colors ${
                  previewPaperColor === 'white'
                    ? 'bg-[#fcfcf9] text-slate-950 border-slate-300'
                    : previewPaperColor === 'pink'
                    ? 'bg-[#fff0f4] text-slate-950 border-pink-300'
                    : 'bg-[#fffde6] text-slate-950 border-amber-300'
                }`}
              >
                {/* Perforation Sprocket Holes Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-dashed border-slate-400 text-[10px] text-slate-500 font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full border border-slate-400 inline-block"></span>
                    <span className="w-2 h-2 rounded-full border border-slate-400 inline-block"></span>
                    <span className="w-2 h-2 rounded-full border border-slate-400 inline-block"></span>
                    <span className="ml-2">CONTINUOUS FORM 9.5 x 5.5 INCH (EPSON LX-310)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>{previewSampleType === 'multi_page' ? 'TOTAL 2 HALAMAN' : 'TOTAL 1 HALAMAN'}</span>
                    <span className="w-2 h-2 rounded-full border border-slate-400 inline-block"></span>
                    <span className="w-2 h-2 rounded-full border border-slate-400 inline-block"></span>
                    <span className="w-2 h-2 rounded-full border border-slate-400 inline-block"></span>
                  </div>
                </div>

                {/* Render Dokumen Menggunakan Format Riil Sesuai Foto 1 & Foto 2 */}
                <ContinuousFormInvoice
                  invoiceNo="4826/JL/UTM/1126"
                  orderNo="SO-202611-0089"
                  storeName="HANANIA MART"
                  storeAddress="DEPAN SD PULO KULON"
                  salesName="RT"
                  orderDate="17/11/2026 17.02.50"
                  dueDate="17/11/2026"
                  notes=""
                  items={sampleItems}
                  grandTotal={sampleGrandTotal}
                  plyType="PUTIH"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
              <span className="text-slate-400 text-[11px]">
                * Tanda tangan hanya menampilkan <strong>{templateConfig.signerLeft}</strong> &amp; <strong>{templateConfig.signerRight}</strong>. Halaman 2 otomatis menggunakan header minimal.
              </span>
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
              >
                Tutup Preview
              </button>
            </div>
          </div>
        </div>
      )}

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
