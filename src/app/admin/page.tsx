'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Truck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  Edit,
  Save,
  X,
  RefreshCw,
  LogOut,
  Layers,
  FileText,
  Boxes,
  ShieldCheck,
  Search,
  Filter,
  CheckSquare,
  Square,
  Plus,
  Minus,
  Trash2,
  PackagePlus,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  MapPin,
  CreditCard,
  TrendingUp,
  DollarSign,
  Banknote,
  Fuel,
  Calendar,
  Sparkles,
  Receipt,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import ContinuousFormInvoice from '@/components/ContinuousFormInvoice';
import DateDropdownPicker from '@/components/DateDropdownPicker';
import { ToastContainer, CustomModalDialog, ToastItem, ModalDialogConfig } from '@/components/UIFeedback';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'review' | 'recap' | 'routes' | 'settlement' | 'finance' | 'inventory' | 'audit'>('review');

  // Toast & Custom Modal Dialog State
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [modalDialog, setModalDialog] = useState<ModalDialogConfig | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = 'toast-' + Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const showAlert = (title: string, message: string) => {
    setModalDialog({
      isOpen: true,
      type: 'alert',
      title,
      message,
    });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, confirmText = 'Ya, Lanjutkan') => {
    setModalDialog({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      confirmText,
      onConfirm,
    });
  };

  const showPrompt = (title: string, message: string, defaultValue: string, onConfirm: (val?: string) => void) => {
    setModalDialog({
      isOpen: true,
      type: 'prompt',
      title,
      message,
      defaultValue,
      confirmText: 'Kirim',
      onConfirm,
    });
  };

  // Orders State & Tipe Faktur Filter
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState<'ALL' | 'SALES' | 'PURCHASE'>('ALL');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [masterStoresList, setMasterStoresList] = useState<any[]>([]);

  // Modal Buat Faktur Pembelian (Stok Masuk)
  const [isAddPurchaseModalOpen, setIsAddPurchaseModalOpen] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({
    store_id: '',
    purchase_date: '',
    notes: '',
    items: [] as any[],
  });
  const [savingPurchase, setSavingPurchase] = useState(false);

  // Modal Detail / Edit Order & Tambah Produk
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [adminNotes, setAdminNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [selectedAddProductId, setSelectedAddProductId] = useState('');
  const [selectedAddUnitName, setSelectedAddUnitName] = useState('');
  const [addQty, setAddQty] = useState(1);

  // Beat Route State (Jadwal Rute Mingguan)
  const [routeSchedules, setRouteSchedules] = useState<any[]>([]);
  const [salesList, setSalesList] = useState<any[]>([]);
  const [zoneList, setZoneList] = useState<string[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [routeForm, setRouteForm] = useState({
    sales_id: '',
    schedule_date: '',
    zone_codes: [] as string[],
    notes: '',
  });
  const [savingRoute, setSavingRoute] = useState(false);

  // Settlement & Piutang State
  const [settlementInvoices, setSettlementInvoices] = useState<any[]>([]);
  const [settlementStores, setSettlementStores] = useState<any[]>([]);
  const [settlementSummary, setSettlementSummary] = useState<any>({
    total_piutang: 0,
    total_jatuh_tempo: 0,
    total_lunas_terbayar: 0,
    overdue_count: 0,
  });
  const [loadingSettlement, setLoadingSettlement] = useState(false);
  const [settlementFilter, setSettlementFilter] = useState('ALL');
  const [selectedInvoiceForSettlement, setSelectedInvoiceForSettlement] = useState<any | null>(null);
  const [settlementPayAmount, setSettlementPayAmount] = useState<number>(0);
  const [settlementPayMethod, setSettlementPayMethod] = useState<'TUNAI' | 'TRANSFER' | 'GIRO'>('TUNAI');
  const [settlementNotes, setSettlementNotes] = useState('');
  const [savingSettlement, setSavingSettlement] = useState(false);

  // Finance & P&L State (Beban Operasional & Laba/Rugi)
  const [selectedMonth, setSelectedMonth] = useState('');
  const [pnlData, setPnlData] = useState<any>(null);
  const [expensesList, setExpensesList] = useState<any[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<any>({});
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [newExpenseForm, setNewExpenseForm] = useState({
    category: 'BBM',
    amount: 50000,
    description: '',
    expense_date: '',
  });
  const [savingNewExpense, setSavingNewExpense] = useState(false);

  // Modal Print Preview 3-Ply Continuous Form (Single & Batch)
  const [printingOrdersList, setPrintingOrdersList] = useState<any[]>([]);

  // Rekap Muatan 24 Jam State
  const [recapData, setRecapData] = useState<any | null>(null);
  const [recapDate, setRecapDate] = useState('');
  const [loadingRecap, setLoadingRecap] = useState(false);

  // Inventory & Audit State
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [refreshingSnapshot, setRefreshingSnapshot] = useState(false);

  // Modal Tambah Produk Baru
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [newProductForm, setNewProductForm] = useState({
    sku: '',
    name: '',
    category: 'Charm',
    initial_stock_pcs: 240,
    ktn_conversion: 24,
    ktn_price_grosir: 68000,
    ktn_price_ecer: 75000,
    bd_price_grosir: 8600,
    bd_price_ecer: 9500,
    pcs_price_grosir: 2900,
    pcs_price_ecer: 3200,
  });
  const [savingNewProduct, setSavingNewProduct] = useState(false);

  // Modal Edit Produk Master
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [savingEditProduct, setSavingEditProduct] = useState(false);

  // Cek Auth Session
  useEffect(() => {
    async function init() {
      const today = new Date().toISOString().split('T')[0];
      const curMonth = new Date().toISOString().slice(0, 7);
      setRecapDate(today);
      setSelectedMonth(curMonth);
      setRouteForm((prev) => ({ ...prev, schedule_date: today }));
      setNewExpenseForm((prev) => ({ ...prev, expense_date: today }));

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
      // Muat inventory fisik terlebih dahulu agar validasi stok instan & akurat
      await loadInventoryAndAudit();
      await loadOrders();
      await loadStores();
    }
    init();
  }, [router]);

  // Lock scroll saat ada modal terbuka di mobile & desktop (Requirement 3)
  const isAnyModalOpen = Boolean(
    editingOrder ||
    isAddPurchaseModalOpen ||
    printingOrdersList.length > 0 ||
    isAddProductModalOpen ||
    editingProduct ||
    selectedInvoiceForSettlement ||
    isAddExpenseModalOpen ||
    modalDialog?.isOpen
  );

  useEffect(() => {
    if (isAnyModalOpen) {
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
  }, [isAnyModalOpen]);

  // Load Toko Master untuk Pembelian
  const loadStores = async () => {
    try {
      const res = await fetch('/api/master/stores');
      const json = await res.json();
      if (json.stores) setMasterStoresList(json.stores);
    } catch (e) {
      console.error(e);
    }
  };

  // Load Orders dari API
  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch('/api/orders');
      const json = await res.json();
      if (json.data) {
        setOrders(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Load Rekap Muatan 24 Jam
  const loadRecap = async (date: string) => {
    setLoadingRecap(true);
    try {
      const res = await fetch(`/api/recap?date=${date}`);
      const json = await res.json();
      setRecapData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRecap(false);
    }
  };

  // Load Inventory & Audit Trails
  const loadInventoryAndAudit = async () => {
    try {
      const res = await fetch('/api/master/products');
      const json = await res.json();
      if (json.products) setInventoryList(json.products);

      const supabase = createClient();
      const { data: logs } = await supabase
        .from('audit_trails')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(20);
      if (logs) setAuditLogs(logs);
    } catch (e) {
      console.error(e);
    }
  };

  // Ambil Snapshot Stok H-1 Manual
  const handleRefreshSnapshot = async () => {
    setRefreshingSnapshot(true);
    try {
      const supabase = createClient();
      const today = new Date().toISOString().split('T')[0];

      for (const p of inventoryList) {
        const currentStock = p.stock_base_unit || 0;
        await supabase.from('inventory_snapshots').upsert({
          snapshot_date: today,
          product_id: p.id,
          stock_base_unit: currentStock,
          is_manual_refresh: true,
        });
      }
      showToast('Snapshot stok H-1 berhasil disinkronisasi untuk sales!', 'success');
      await loadInventoryAndAudit();
    } catch (e: any) {
      showToast(e.message || 'Gagal sinkronisasi snapshot', 'error');
    } finally {
      setRefreshingSnapshot(false);
    }
  };

  // Load Beat Routes (Jadwal Rute Mingguan)
  const loadRoutes = async () => {
    setLoadingRoutes(true);
    try {
      const res = await fetch('/api/routes');
      const json = await res.json();
      if (json.data) setRouteSchedules(json.data);
      if (json.sales_list) {
        setSalesList(json.sales_list);
        if (!routeForm.sales_id && json.sales_list.length > 0) {
          setRouteForm((prev) => ({ ...prev, sales_id: json.sales_list[0].id }));
        }
      }
      if (json.zones) setZoneList(json.zones);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRoutes(false);
    }
  };

  const handleSaveRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeForm.sales_id || !routeForm.schedule_date || routeForm.zone_codes.length === 0) {
      showToast('Pilih sales, tanggal, dan minimal 1 zona rute.', 'error');
      return;
    }
    setSavingRoute(true);
    try {
      const res = await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...routeForm,
          admin_id: adminUser?.id,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan rute');
      showToast(json.message || 'Jadwal rute berhasil disimpan!', 'success');
      await loadRoutes();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingRoute(false);
    }
  };

  const handleDeleteRoute = async (id: string) => {
    showConfirm('Hapus Jadwal Rute', 'Apakah Anda yakin ingin menghapus jadwal rute ini?', async () => {
      try {
        const res = await fetch(`/api/routes?id=${id}&admin_id=${adminUser?.id}`, {
          method: 'DELETE',
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Gagal menghapus');
        showToast('Jadwal rute berhasil dihapus.', 'success');
        await loadRoutes();
      } catch (err: any) {
        showToast(err.message, 'error');
      }
    });
  };

  // Load Settlement & Piutang
  const loadSettlement = async (status = settlementFilter) => {
    setLoadingSettlement(true);
    try {
      const res = await fetch(`/api/settlement?status=${status}`);
      const json = await res.json();
      if (json.invoices) setSettlementInvoices(json.invoices);
      if (json.stores) setSettlementStores(json.stores);
      if (json.summary) setSettlementSummary(json.summary);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSettlement(false);
    }
  };

  const handleSaveSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForSettlement || settlementPayAmount <= 0) return;
    setSavingSettlement(true);
    try {
      const res = await fetch('/api/settlement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: selectedInvoiceForSettlement.id,
          amount: settlementPayAmount,
          payment_method: settlementPayMethod,
          notes: settlementNotes,
          user_id: adminUser?.id,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan pembayaran');
      showToast(json.message || 'Pembayaran piutang berhasil dicatat!', 'success');
      setSelectedInvoiceForSettlement(null);
      setSettlementPayAmount(0);
      setSettlementNotes('');
      await loadSettlement();
      await loadOrders();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingSettlement(false);
    }
  };

  // Load Expenses & Laba/Rugi (P&L)
  const loadExpenses = async (month = selectedMonth) => {
    setLoadingExpenses(true);
    try {
      const res = await fetch(`/api/expenses?month=${month}`);
      const json = await res.json();
      if (json.pnl) setPnlData(json.pnl);
      if (json.expenses) setExpensesList(json.expenses);
      if (json.category_breakdown) setCategoryBreakdown(json.category_breakdown);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingExpenses(false);
    }
  };

  const handleSaveNewExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpenseForm.amount || !newExpenseForm.description) return;
    setSavingNewExpense(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newExpenseForm,
          claimed_by: adminUser?.id,
          is_verified: true,
          verified_by: adminUser?.id,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan pengeluaran');
      showToast(json.message || 'Pengeluaran operasional berhasil dicatat!', 'success');
      setIsAddExpenseModalOpen(false);
      setNewExpenseForm({
        category: 'BBM',
        amount: 50000,
        description: '',
        expense_date: new Date().toISOString().split('T')[0],
      });
      await loadExpenses();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingNewExpense(false);
    }
  };

  // Helper: Cek Peringatan Stok Gudang Kurang / Habis (Hanya jika inventory selesai di-load)
  const getStockAlert = (order: any) => {
    if (order.status !== 'SUBMITTED' && order.status !== 'PENDING_PAYMENT') return null;
    if (!order.items || order.items.length === 0) return null;
    // Hindari warning palsu saat data inventaris belum termuat di memori
    if (!inventoryList || inventoryList.length === 0) return null;

    const lowStockItems: { name: string; needed: number; available: number }[] = [];

    for (const it of order.items) {
      const p = inventoryList.find((prod) => prod.id === it.product_id);
      // Validasi hanya jika data produk ditemukan di master inventaris gudang
      if (!p) continue;

      const available = Number(p.stock_base_unit ?? 0);
      const needed = (it.quantity || 0) * (it.conversion_qty || 1);

      if (available < needed || available <= 0) {
        lowStockItems.push({
          name: it.product?.name || p.name || 'Produk',
          needed,
          available,
        });
      }
    }

    return lowStockItems.length > 0 ? lowStockItems : null;
  };

  // Approve Order Tunggal
  const handleApproveOrder = async (orderId: string) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    const stockAlerts = targetOrder ? getStockAlert(targetOrder) : null;

    const executeApproval = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'APPROVE',
            admin_id: adminUser.id,
          }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Gagal menyetujui');

        showToast(json.message || 'Pesanan berhasil disetujui & faktur terbit!', 'success');
        await loadOrders();
        await loadInventoryAndAudit();
      } catch (err: any) {
        showToast(err.message, 'error');
      }
    };

    if (stockAlerts && stockAlerts.length > 0) {
      const details = stockAlerts
        .map((sa) => `• ${sa.name} (Tersisa: ${sa.available} PCS, Dibutuhkan: ${sa.needed} PCS)`)
        .join('\n');
      showConfirm(
        '⚠️ Peringatan Stok Gudang',
        `Stok gudang tidak mencukupi:\n${details}\n\nTetap setujui pesanan ini sekarang? (Stok akan otomatis dipotong dan pesanan lain yang memesan produk yang sama akan diberi tanda peringatan).`,
        executeApproval,
        'Tetap Setujui'
      );
    } else {
      showConfirm(
        'Konfirmasi Persetujuan',
        'Setujui pesanan ini? Stok fisik gudang akan otomatis dipotong dan faktur resmi diterbitkan.',
        executeApproval,
        'Setujui Sekarang'
      );
    }
  };

  // Approve Batch Terpilih
  const handleApproveBatch = () => {
    if (selectedOrderIds.length === 0) {
      showToast('Pilih minimal 1 pesanan terlebih dahulu.', 'info');
      return;
    }

    showConfirm(
      'Konfirmasi Approve Batch',
      `Setujui ${selectedOrderIds.length} pesanan sekaligus? Stok gudang akan otomatis dipotong.`,
      async () => {
        try {
          for (const id of selectedOrderIds) {
            await fetch(`/api/orders/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'APPROVE',
                admin_id: adminUser.id,
              }),
            });
          }

          setSelectedOrderIds([]);
          showToast('Semua pesanan terpilih berhasil disetujui & faktur terbit!', 'success');
          await loadOrders();
          await loadInventoryAndAudit();
        } catch (err: any) {
          showToast(err.message, 'error');
        }
      },
      'Setujui Semua'
    );
  };

  // Cetak Batch 3-Ply Terpilih
  const handleBatchPrint = () => {
    const selectedApproved = orders.filter(
      (o) => selectedOrderIds.includes(o.id) && o.status === 'APPROVED'
    );

    if (selectedApproved.length === 0) {
      showToast('Pilih minimal 1 pesanan yang sudah berstatus APPROVED untuk dicetak.', 'info');
      return;
    }

    setPrintingOrdersList(selectedApproved);
  };

  // Berikan Dispensasi Kredit (Bypass Token)
  const handleBypassCredit = (orderId: string) => {
    showPrompt(
      'Beri Dispensasi Kredit',
      'Masukkan kode / alasan dispensasi kredit untuk toko ini:',
      'ACC_OWNER_BUMIAYU',
      async (token?: string) => {
        if (!token) return;

        try {
          const res = await fetch(`/api/orders/${orderId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'BYPASS_CREDIT',
              admin_id: adminUser.id,
              bypass_token: token,
              admin_notes: `Dispensasi disetujui Owner: ${token}`,
            }),
          });
          const json = await res.json();
          showToast(json.message || 'Status pesanan berhasil diubah menjadi SUBMITTED', 'success');
          await loadOrders();
        } catch (e: any) {
          showToast(e.message, 'error');
        }
      }
    );
  };

  // Modal Faktur Pembelian Handlers
  const openAddPurchaseModal = () => {
    const today = new Date().toISOString().split('T')[0];
    setPurchaseForm({
      store_id: masterStoresList.length > 0 ? masterStoresList[0].id : '',
      purchase_date: today,
      notes: '',
      items: [],
    });
    setIsAddPurchaseModalOpen(true);
  };

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseForm.store_id) {
      showToast('Pilih toko asal pembelian / supplier terlebih dahulu.', 'error');
      return;
    }
    if (purchaseForm.items.length === 0) {
      showToast('Tambahkan minimal 1 produk yang dibeli.', 'error');
      return;
    }

    setSavingPurchase(true);
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...purchaseForm,
          admin_id: adminUser?.id,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan faktur pembelian.');

      showToast(json.message || 'Faktur pembelian berhasil dibuat dan stok gudang bertambah!', 'success');
      setIsAddPurchaseModalOpen(false);
      await loadOrders();
      await loadInventoryAndAudit();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingPurchase(false);
    }
  };

  // Buka Modal Edit Item Pesanan
  const openEditModal = (order: any) => {
    setEditingOrder(order);
    setEditItems(
      (order.items || []).map((it: any) => ({
        id: it.id,
        product_id: it.product_id,
        product_unit_id: it.product_unit_id,
        product_name: it.product?.name || 'Produk',
        unit_name: it.unit_name,
        quantity: it.quantity,
        conversion_qty: it.conversion_qty || 1,
        unit_price: it.unit_price,
        total_price: it.total_price,
      }))
    );
    setAdminNotes(order.admin_notes || '');

    if (inventoryList.length > 0) {
      setSelectedAddProductId(inventoryList[0].id);
      const defaultUnit = inventoryList[0].units?.[0]?.unit_name || 'KTN';
      setSelectedAddUnitName(defaultUnit);
      setAddQty(1);
    }
  };

  // Tambah Produk Baru ke Pesanan yang Diedit
  const handleAddNewItemToOrder = () => {
    const prod = inventoryList.find((p) => p.id === selectedAddProductId);
    if (!prod) return;

    const unit = (prod.units || []).find((u: any) => u.unit_name === selectedAddUnitName) || prod.units?.[0];
    const unitPrice = unit?.price_grosir || unit?.price_ecer || 0;
    const qty = Math.max(1, Number(addQty) || 1);
    const convQty = unit?.conversion_qty || 1;

    const newItem = {
      id: '', // Empty ID menandakan item baru
      product_id: prod.id,
      product_unit_id: unit?.id || '',
      product_name: prod.name,
      unit_name: unit?.unit_name || selectedAddUnitName || 'PCS',
      quantity: qty,
      conversion_qty: convQty,
      unit_price: unitPrice,
      total_price: qty * unitPrice,
    };

    setEditItems([...editItems, newItem]);
  };

  // Simpan Perubahan Kuantitas Item
  const handleSaveEditItems = async () => {
    if (!editingOrder) return;
    setSavingEdit(true);

    try {
      const res = await fetch(`/api/orders/${editingOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'EDIT_ITEMS',
          admin_id: adminUser.id,
          items: editItems,
          admin_notes: adminNotes,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan');

      showToast(json.message || 'Perubahan kuantitas faktur berhasil disimpan!', 'success');
      setEditingOrder(null);
      await loadOrders();
      await loadInventoryAndAudit();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  // Simpan Tambah Produk Baru
  const handleSaveNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingNewProduct(true);

    try {
      const units = [
        {
          unit_name: 'KTN',
          conversion_qty: Number(newProductForm.ktn_conversion) || 24,
          price_grosir: Number(newProductForm.ktn_price_grosir),
          price_ecer: Number(newProductForm.ktn_price_ecer),
          is_default_sales: true,
        },
        {
          unit_name: 'BD',
          conversion_qty: 3,
          price_grosir: Number(newProductForm.bd_price_grosir),
          price_ecer: Number(newProductForm.bd_price_ecer),
          is_default_sales: false,
        },
        {
          unit_name: 'PCS',
          conversion_qty: 1,
          price_grosir: Number(newProductForm.pcs_price_grosir),
          price_ecer: Number(newProductForm.pcs_price_ecer),
          is_default_sales: false,
        },
      ];

      const res = await fetch('/api/master/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: newProductForm.sku,
          name: newProductForm.name,
          category: newProductForm.category,
          base_unit: 'PCS',
          units,
          initial_stock: Number(newProductForm.initial_stock_pcs),
          admin_id: adminUser?.id,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menambahkan produk');

      showToast('Produk baru berhasil ditambahkan ke master katalog!', 'success');
      setIsAddProductModalOpen(false);
      setNewProductForm({
        sku: '',
        name: '',
        category: 'Charm',
        initial_stock_pcs: 240,
        ktn_conversion: 24,
        ktn_price_grosir: 68000,
        ktn_price_ecer: 75000,
        bd_price_grosir: 8600,
        bd_price_ecer: 9500,
        pcs_price_grosir: 2900,
        pcs_price_ecer: 3200,
      });
      await loadInventoryAndAudit();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingNewProduct(false);
    }
  };

  // Simpan Edit Master Produk
  const handleSaveEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSavingEditProduct(true);

    try {
      const res = await fetch(`/api/master/products/${editingProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: editingProduct.sku,
          name: editingProduct.name,
          category: editingProduct.category,
          stock_base_unit: Number(editingProduct.stock_base_unit),
          units: editingProduct.units,
          admin_id: adminUser?.id,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan perubahan');

      showToast('Data produk berhasil diperbarui.', 'success');
      setEditingProduct(null);
      await loadInventoryAndAudit();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingEditProduct(false);
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('bumiayu_auth_user');
      localStorage.removeItem('bumiayu_role');
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (e) {
      console.error(e);
    }
    router.replace('/');
  };

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    const isPurchase = o.order_no?.startsWith('PO-') || o.admin_notes?.includes('[FAKTUR_PEMBELIAN_STOK]');

    if (invoiceTypeFilter === 'SALES' && isPurchase) return false;
    if (invoiceTypeFilter === 'PURCHASE' && !isPurchase) return false;
    return matchesStatus;
  });

  const toggleSelectOrder = (id: string) => {
    if (selectedOrderIds.includes(id)) {
      setSelectedOrderIds(selectedOrderIds.filter((item) => item !== id));
    } else {
      setSelectedOrderIds([...selectedOrderIds, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map((o) => o.id));
    }
  };

  const countPending = orders.filter((o) => o.status === 'SUBMITTED').length;
  const countHold = orders.filter((o) => o.status === 'PENDING_PAYMENT').length;
  const countApproved = orders.filter((o) => o.status === 'APPROVED').length;
  const totalOmset = orders
    .filter((o) => o.status === 'APPROVED' && !o.order_no?.startsWith('PO-') && !o.admin_notes?.includes('[FAKTUR_PEMBELIAN_STOK]'))
    .reduce((sum, o) => sum + Number(o.grand_total || 0), 0);

  const selectedApprovedCount = orders.filter(
    (o) => selectedOrderIds.includes(o.id) && o.status === 'APPROVED'
  ).length;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16 font-sans">
      {/* Top Header Admin */}
      <header className="sticky top-0 z-30 px-6 py-3.5 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-600/20">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight">BumiAyu | Panel Owner</h1>
            <p className="text-xs text-slate-500">
              Admin: <span className="font-semibold text-emerald-600">{adminUser?.user_metadata?.full_name || 'Owner'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadOrders}
            className="h-8 px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Muat Ulang Data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleLogout}
            className="h-8 px-3 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Keluar"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* STATS CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <p className="text-xs font-semibold text-slate-500">Perlu Direview</p>
            <p className="text-2xl font-extrabold text-amber-500 mt-1">{countPending}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Status SUBMITTED</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <p className="text-xs font-semibold text-slate-500">Ditahan (Kredit Lock)</p>
            <p className="text-2xl font-extrabold text-rose-500 mt-1">{countHold}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Toko over limit / jatuh tempo</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <p className="text-xs font-semibold text-slate-500">Siap Cetak / Kirim</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">{countApproved}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Faktur terbit & stok terpotong</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <p className="text-xs font-semibold text-slate-500">Total Omset Disetujui</p>
            <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
              Rp {totalOmset.toLocaleString('id-ID')}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Faktur penjualan aktif</p>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-5 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('review')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'review'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            Review & Faktur
          </button>
          <button
            onClick={() => {
              setActiveTab('recap');
              loadRecap(recapDate);
            }}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'recap'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            Rekap 24 Jam
          </button>
          <button
            onClick={() => {
              setActiveTab('routes');
              loadRoutes();
            }}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'routes'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Jadwal Rute Mingguan
          </button>
          <button
            onClick={() => {
              setActiveTab('settlement');
              loadSettlement();
            }}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'settlement'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Pelunasan & Piutang
          </button>
          <button
            onClick={() => {
              setActiveTab('finance');
              loadExpenses();
            }}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'finance'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Beban & Laba/Rugi (P&L)
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'inventory'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Boxes className="w-4 h-4" />
            Stok & Produk
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'audit'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Audit Logs
          </button>
        </div>

        {/* TAB 1: REVIEW SALES ORDER */}
        {activeTab === 'review' && (
          <div className="space-y-4">
            {/* Action Bar & Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
              <div className="flex flex-wrap items-center gap-3">
                {/* Filter Tipe Faktur: Sesuai Foto User */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Filter:</span>
                  <div className="relative inline-flex items-center">
                    <select
                      value={invoiceTypeFilter}
                      onChange={(e) => setInvoiceTypeFilter(e.target.value as any)}
                      className="appearance-none text-xs font-bold pl-3.5 pr-8 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs cursor-pointer"
                    >
                      <option value="ALL">Semua Faktur</option>
                      <option value="SALES">Faktur Penjualan (SO)</option>
                      <option value="PURCHASE">Faktur Pembelian (PO)</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
                  </div>
                </div>

                {/* Filter Status */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5" /> Status:
                  </span>
                  <div className="relative inline-flex items-center">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="appearance-none text-xs font-bold pl-3.5 pr-8 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs cursor-pointer"
                    >
                      <option value="ALL">Semua Status ({orders.length})</option>
                      <option value="SUBMITTED">Menunggu Review ({countPending})</option>
                      <option value="PENDING_PAYMENT">Ditahan / Locked ({countHold})</option>
                      <option value="APPROVED">Disetujui / Approved ({countApproved})</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Action Buttons & Buat Faktur Pembelian */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={openAddPurchaseModal}
                  className="h-8 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all"
                >
                  <PackagePlus className="w-3.5 h-3.5" />
                  + Buat Faktur Pembelian (Stok Masuk)
                </button>

                {selectedOrderIds.length > 0 && (
                  <>
                    <button
                      onClick={handleApproveBatch}
                      className="h-8 px-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approve Terpilih ({selectedOrderIds.length})
                    </button>

                    {selectedApprovedCount > 0 && (
                      <button
                        onClick={handleBatchPrint}
                        className="h-8 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all"
                      >
                        <Printer className="w-3.5 h-3.5 text-emerald-400" />
                        Cetak Batch 3-Ply ({selectedApprovedCount})
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Orders Table Simetris (Sesuai Foto 1 & Foto 5) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4 w-12 text-center align-middle">
                        <button type="button" onClick={toggleSelectAll} className="flex items-center justify-center mx-auto">
                          {selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0 ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </th>
                      <th className="py-3 px-4 align-middle">No. Pesanan / Faktur</th>
                      <th className="py-3 px-4 align-middle">Toko / Wilayah</th>
                      <th className="py-3 px-4 align-middle">Sales / Pembuat</th>
                      <th className="py-3 px-4 text-right align-middle">Grand Total</th>
                      <th className="py-3 px-4 text-center align-middle">Status</th>
                      <th className="py-3 px-4 text-center align-middle w-48">Aksi Owner</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {loadingOrders ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          Memuat data pesanan...
                        </td>
                      </tr>
                    ) : filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          Tidak ada pesanan ditemukan.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => {
                        const isPurchase =
                          order.order_no?.startsWith('PO-') ||
                          order.admin_notes?.includes('[FAKTUR_PEMBELIAN_STOK]');
                        const stockAlerts = getStockAlert(order);

                        return (
                          <tr
                            key={order.id}
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-950/50 transition-colors"
                          >
                            <td className="py-3 px-4 text-center align-middle">
                              <button
                                type="button"
                                onClick={() => toggleSelectOrder(order.id)}
                                className="flex items-center justify-center mx-auto"
                              >
                                {selectedOrderIds.includes(order.id) ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-400" />
                                )}
                              </button>
                            </td>
                            <td className="py-3 px-4 align-middle font-bold text-emerald-600">
                              <div className="flex items-center gap-1.5">
                                <span>{order.order_no}</span>
                                {isPurchase && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                    Beli Stok
                                  </span>
                                )}
                              </div>
                              {order.is_edited_by_admin && (
                                <span className="block text-[10px] text-amber-500 font-normal italic">
                                  *Direvisi Admin
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 align-middle">
                              <div className="font-extrabold text-slate-900 dark:text-slate-100">
                                {order.store?.name}
                                {isPurchase && (
                                  <span className="text-slate-500 font-normal text-[11px] ml-1">(Supplier)</span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {order.store?.zone_code} | TOP: {order.store?.top_days === 0 ? 'Tunai' : `${order.store?.top_days} Hari`}
                              </div>

                              {/* Alert Warning Stok Kurang / Habis (Sesuai Permintaan User) */}
                              {stockAlerts && stockAlerts.length > 0 && (
                                <div className="mt-1.5 space-y-1">
                                  {stockAlerts.map((sa: any, sIdx: number) => (
                                    <div
                                      key={sIdx}
                                      className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 px-2 py-0.5 rounded-md"
                                    >
                                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                      <span>
                                        ⚠️ Stok Kurang: <span className="underline">{sa.name}</span> (Sisa: {sa.available} PCS, Butuh: {sa.needed} PCS) — Perlu Review Owner!
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 align-middle text-slate-600 dark:text-slate-300">
                              {order.sales?.full_name || 'Admin'}
                            </td>
                            <td className="py-3 px-4 text-right align-middle font-extrabold text-slate-900 dark:text-slate-100">
                              Rp {Number(order.grand_total).toLocaleString('id-ID')}
                            </td>
                            <td className="py-3 px-4 text-center align-middle">
                              <span
                                className={`inline-block px-2.5 py-1 rounded-full font-bold text-[10px] ${
                                  order.status === 'APPROVED'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : order.status === 'PENDING_PAYMENT'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                }`}
                              >
                                {order.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center align-middle">
                              {/* Tombol Simetris: Sesuai Foto 5 (Ukuran w-28 & h-8 Seragam) */}
                              <div className="flex items-center justify-center gap-2">
                                {/* Edit Button */}
                                <button
                                  onClick={() => openEditModal(order)}
                                  title="Lihat & Sesuaikan Kuantitas Item"
                                  className="w-8 h-8 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-colors shrink-0 shadow-2xs"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>

                                {/* Tombol Approve (Ukuran w-28 h-8) */}
                                {order.status === 'SUBMITTED' && (
                                  <button
                                    onClick={() => handleApproveOrder(order.id)}
                                    title="Approve & Potong Stok Fisik"
                                    className="w-28 h-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-2xs flex items-center justify-center gap-1.5 transition-colors shrink-0"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Approve
                                  </button>
                                )}

                                {/* Tombol Bypass Credit (Ukuran w-28 h-8) */}
                                {order.status === 'PENDING_PAYMENT' && (
                                  <button
                                    onClick={() => handleBypassCredit(order.id)}
                                    title="Beri Dispensasi Kredit (Bypass Lock)"
                                    className="w-28 h-8 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] shadow-2xs flex items-center justify-center gap-1 shrink-0"
                                  >
                                    Bypass
                                  </button>
                                )}

                                {/* Tombol Cetak Faktur 3-Ply Continuous Form (Ukuran w-28 h-8) */}
                                {order.status === 'APPROVED' && (
                                  <button
                                    onClick={() => setPrintingOrdersList([order])}
                                    title="Cetak Faktur 3-Ply Continuous Form"
                                    className="w-28 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-[11px] shadow-2xs flex items-center justify-center gap-1.5 transition-colors shrink-0"
                                  >
                                    <Printer className="w-3.5 h-3.5 text-emerald-400" />
                                    Cetak 3-Ply
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: REKAP MUATAN GUDANG 24 JAM */}
        {activeTab === 'recap' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
              <div>
                <h3 className="font-bold text-sm">Rekap Muatan Gudang 24 Jam (Consolidated Picking Sheet)</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Akumulasi total Karton, Bendit, dan Pcs dari seluruh pesanan yang telah disetujui Owner.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <DateDropdownPicker
                  value={recapDate}
                  onChange={(newDate) => {
                    setRecapDate(newDate);
                    loadRecap(newDate);
                  }}
                />
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  Cetak Lembar Muat
                </button>
              </div>
            </div>

            {loadingRecap ? (
              <p className="p-8 text-center text-slate-500 text-xs">Menghitung akumulasi muatan...</p>
            ) : !recapData || recapData.summary?.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                Tidak ada pesanan berstatus APPROVED pada tanggal ini.
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden p-4">
                <div className="text-xs text-slate-500 mb-3 flex items-center justify-between">
                  <span>Total Faktur Masuk: <strong>{recapData.total_orders_count} Nota</strong></span>
                  <span>Diperbarui: {new Date(recapData.generated_at).toLocaleTimeString('id-ID')}</span>
                </div>

                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-400 uppercase text-[11px]">
                      <th className="p-3">Kode SKU</th>
                      <th className="p-3">Nama Produk Charm</th>
                      <th className="p-3 text-center">Total Karton (KTN)</th>
                      <th className="p-3 text-center">Total Bendit (BD)</th>
                      <th className="p-3 text-center">Total Ecer (PCS)</th>
                      <th className="p-3 text-right">Ekuivalen Stok (PCS)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {recapData.summary.map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-950">
                        <td className="p-3 font-bold text-emerald-600">{row.sku}</td>
                        <td className="p-3 font-medium">{row.name}</td>
                        <td className="p-3 text-center font-extrabold text-sm text-slate-900 dark:text-slate-100">
                          {row.total_ktn > 0 ? `${row.total_ktn} KTN` : '-'}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-700 dark:text-slate-300">
                          {row.total_bd > 0 ? `${row.total_bd} BD` : '-'}
                        </td>
                        <td className="p-3 text-center text-slate-600 dark:text-slate-400">
                          {row.total_pcs > 0 ? `${row.total_pcs} PCS` : '-'}
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-700 dark:text-emerald-400">
                          {row.total_base_unit} PCS
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB: JADWAL RUTE SALES MINGGUAN (BEAT ROUTE)                         */}
        {/* ==================================================================== */}
        {activeTab === 'routes' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  Jadwal Rute Kunjungan Mingguan (Dynamic Beat Route)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tentukan penugasan wilayah rute untuk tiap sales selama 7 hari ke depan. Toko yang sejalur dapat digabungkan.
                </p>
              </div>
              <button
                type="button"
                onClick={loadRoutes}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingRoutes ? 'animate-spin' : ''}`} />
                Muat Ulang
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Input / Update Jadwal Rute */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2 border-b pb-2 dark:border-slate-800">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Atur / Perbarui Rute Sales
                </h4>

                <form onSubmit={handleSaveRoute} className="space-y-3.5">
                  <div>
                    <label className="text-xs font-bold block mb-1">Sales Lapangan</label>
                    <div className="relative">
                      <select
                        value={routeForm.sales_id}
                        onChange={(e) => setRouteForm({ ...routeForm, sales_id: e.target.value })}
                        className="w-full appearance-none px-3 pr-9 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                        required
                      >
                        {salesList.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.full_name} (@{s.username})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold block mb-1">Tanggal Kunjungan</label>
                    <DateDropdownPicker
                      value={routeForm.schedule_date}
                      onChange={(d) => setRouteForm({ ...routeForm, schedule_date: d })}
                    />
                    <div className="flex items-center gap-1.5 mt-2">
                      {[0, 1, 2].map((dayOffset) => {
                        const d = new Date();
                        d.setDate(d.getDate() + dayOffset);
                        const iso = d.toISOString().split('T')[0];
                        const label = dayOffset === 0 ? 'Hari Ini' : dayOffset === 1 ? 'Besok' : 'Lusa';
                        return (
                          <button
                            key={iso}
                            type="button"
                            onClick={() => setRouteForm({ ...routeForm, schedule_date: iso })}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-colors ${
                              routeForm.schedule_date === iso
                                ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950 text-emerald-700'
                                : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold block mb-1">Pilih Wilayah / Zona Toko (Bisa &gt;1)</label>
                    <div className="space-y-1.5 max-h-44 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                      {zoneList.map((z) => {
                        const isChecked = routeForm.zone_codes.includes(z);
                        return (
                          <label
                            key={z}
                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-xs font-semibold ${
                              isChecked
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setRouteForm({
                                    ...routeForm,
                                    zone_codes: routeForm.zone_codes.filter((zc) => zc !== z),
                                  });
                                } else {
                                  setRouteForm({
                                    ...routeForm,
                                    zone_codes: [...routeForm.zone_codes, z],
                                  });
                                }
                              }}
                              className="rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>{z}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold block mb-1">Catatan Instruksi Rute (Opsional)</label>
                    <input
                      type="text"
                      value={routeForm.notes}
                      onChange={(e) => setRouteForm({ ...routeForm, notes: e.target.value })}
                      placeholder="cth: Fokuskan penagihan piutang dan tawaran produk ecer..."
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingRoute}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {savingRoute ? 'Menyimpan...' : 'Simpan Penugasan Rute'}
                  </button>
                </form>
              </div>

              {/* Tabel Penugasan Rute Mingguan */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 border-b pb-2 dark:border-slate-800 flex items-center justify-between">
                  <span>Daftar Penugasan Rute Aktif</span>
                  <span className="text-xs font-normal text-slate-400">
                    {routeSchedules.length} Jadwal Tercatat
                  </span>
                </h4>

                {loadingRoutes ? (
                  <p className="text-xs text-slate-400 py-12 text-center">Memuat jadwal...</p>
                ) : routeSchedules.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl">
                    Belum ada jadwal rute yang ditentukan. Gunakan formulir di sebelah kiri untuk mengatur rute.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-400 text-[11px]">
                          <th className="p-2.5">Tanggal</th>
                          <th className="p-2.5">Sales Lapangan</th>
                          <th className="p-2.5">Wilayah / Zona Terjadwal</th>
                          <th className="p-2.5">Catatan Rute</th>
                          <th className="p-2.5 text-center w-16">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {routeSchedules.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-950/40">
                            <td className="p-2.5 font-bold font-mono text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                              {item.schedule_date}
                            </td>
                            <td className="p-2.5 font-extrabold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                              {item.sales?.full_name}
                            </td>
                            <td className="p-2.5">
                              <div className="flex flex-wrap gap-1">
                                {item.zone_codes?.map((zc: string) => (
                                  <span
                                    key={zc}
                                    className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  >
                                    {zc}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-2.5 text-slate-500 text-[11px]">
                              {item.notes || '-'}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteRoute(item.id)}
                                title="Hapus jadwal"
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB: PELUNASAN & PIUTANG TOKO (SETTLEMENT)                           */}
        {/* ==================================================================== */}
        {activeTab === 'settlement' && (
          <div className="space-y-6">
            {/* KPI STATS CARDS PIUTANG */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <p className="text-xs font-semibold text-slate-500">Total Piutang Berjalan</p>
                <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                  Rp {Number(settlementSummary.total_piutang || 0).toLocaleString('id-ID')}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Seluruh nota belum lunas</p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <p className="text-xs font-semibold text-slate-500">Piutang Lewat Jatuh Tempo</p>
                <p className="text-xl font-extrabold text-rose-600 mt-1">
                  Rp {Number(settlementSummary.total_jatuh_tempo || 0).toLocaleString('id-ID')}
                </p>
                <p className="text-[11px] text-rose-500 font-semibold mt-0.5">
                  {settlementSummary.overdue_count} Faktur Perlu Tagih
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <p className="text-xs font-semibold text-slate-500">Total Setoran Terkumpul</p>
                <p className="text-xl font-extrabold text-emerald-600 mt-1">
                  Rp {Number(settlementSummary.total_lunas_terbayar || 0).toLocaleString('id-ID')}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Uang kas & transfer masuk</p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <p className="text-xs font-semibold text-slate-500">Toko Terkunci (Over Limit)</p>
                <p className="text-xl font-extrabold text-amber-600 mt-1">
                  {settlementStores.filter((s) => s.is_locked).length} Toko
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Order ditahan otomatis</p>
              </div>
            </div>

            {/* TABEL FAKTUR PENJUALAN & PELUNASAN */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 dark:border-slate-800">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    Daftar Faktur Penjualan & Status Pembayaran
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Verifikasi setoran uang masuk toko dan hapus piutang secara real-time.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Filter:</span>
                  <div className="relative inline-flex items-center">
                    <select
                      value={settlementFilter}
                      onChange={(e) => {
                        setSettlementFilter(e.target.value);
                        loadSettlement(e.target.value);
                      }}
                      className="appearance-none text-xs font-bold pl-3.5 pr-8 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs cursor-pointer"
                    >
                      <option value="ALL">Semua Faktur</option>
                      <option value="BELUM_LUNAS">Belum Lunas</option>
                      <option value="SEBAGIAN">Sebagian (Cicil)</option>
                      <option value="LUNAS">Lunas</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
                  </div>
                </div>
              </div>

              {loadingSettlement ? (
                <p className="text-xs text-slate-400 py-12 text-center">Memuat faktur piutang...</p>
              ) : settlementInvoices.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl">
                  Tidak ada faktur dengan filter ini.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-400 text-[11px]">
                        <th className="p-3">No. Faktur</th>
                        <th className="p-3">Toko / Wilayah</th>
                        <th className="p-3">Jatuh Tempo</th>
                        <th className="p-3 text-right">Total Nilai</th>
                        <th className="p-3 text-right">Terbayar</th>
                        <th className="p-3 text-right">Sisa Piutang</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-center w-28">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {settlementInvoices.map((inv) => {
                        const remaining = Number(inv.remaining_balance || 0);
                        const isOverdue = inv.due_date < new Date().toISOString().split('T')[0] && inv.payment_status !== 'LUNAS';

                        return (
                          <tr key={inv.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-950/40">
                            <td className="p-3 font-mono font-bold text-emerald-600">{inv.invoice_no}</td>
                            <td className="p-3">
                              <div className="font-extrabold text-slate-900 dark:text-slate-100">{inv.store?.name}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {inv.store?.zone_code} • TOP {inv.store?.top_days === 0 ? 'Tunai' : `${inv.store?.top_days} Hari`}
                              </div>
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isOverdue
                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                {isOverdue ? `Lewat (${inv.due_date})` : inv.due_date}
                              </span>
                            </td>
                            <td className="p-3 text-right font-semibold">
                              Rp {Number(inv.total_amount).toLocaleString('id-ID')}
                            </td>
                            <td className="p-3 text-right font-semibold text-emerald-600">
                              Rp {Number(inv.paid_amount || 0).toLocaleString('id-ID')}
                            </td>
                            <td className="p-3 text-right font-extrabold text-slate-900 dark:text-slate-100">
                              Rp {remaining.toLocaleString('id-ID')}
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                  inv.payment_status === 'LUNAS'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : inv.payment_status === 'SEBAGIAN'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                }`}
                              >
                                {inv.payment_status}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {inv.payment_status !== 'LUNAS' && remaining > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedInvoiceForSettlement(inv);
                                    setSettlementPayAmount(remaining);
                                  }}
                                  className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-2xs transition-colors"
                                >
                                  Catat Bayar
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-semibold italic">Lunas</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* TABEL STATUS LIMIT KREDIT & SALDO TOKO */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 border-b pb-2 dark:border-slate-800">
                Plafon Limit Kredit & Status Gembok Toko
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-400 text-[11px]">
                      <th className="p-2.5">Kode Toko</th>
                      <th className="p-2.5">Nama Toko</th>
                      <th className="p-2.5">Wilayah</th>
                      <th className="p-2.5 text-right">Plafon Kredit (Limit)</th>
                      <th className="p-2.5 text-right">Saldo Piutang Berjalan</th>
                      <th className="p-2.5 text-center">Status Gembok</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {settlementStores.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-950/40">
                        <td className="p-2.5 font-mono font-bold text-emerald-600">{st.code}</td>
                        <td className="p-2.5 font-bold">{st.name}</td>
                        <td className="p-2.5">{st.zone_code}</td>
                        <td className="p-2.5 text-right font-semibold">
                          {st.credit_limit > 0 ? `Rp ${Number(st.credit_limit).toLocaleString('id-ID')}` : 'Wajib Tunai'}
                        </td>
                        <td className="p-2.5 text-right font-extrabold text-slate-900 dark:text-slate-100">
                          Rp {Number(st.current_debt || 0).toLocaleString('id-ID')}
                        </td>
                        <td className="p-2.5 text-center">
                          {st.is_locked ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800">
                              🔒 Terkunci (Order Tertahan)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                              ✓ Normal (Lancar)
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB: BEBAN OPERASIONAL & LABA / RUGI (P&L)                           */}
        {/* ==================================================================== */}
        {activeTab === 'finance' && (
          <div className="space-y-6">
            {/* Header Filter Bulan & Tombol Input Beban */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  Bulan Pembukuan:
                </span>

                {/* Dropdown Pilihan Bulan */}
                <div className="relative inline-flex items-center">
                  <select
                    value={selectedMonth ? selectedMonth.split('-')[1] : '11'}
                    onChange={(e) => {
                      const curYear = selectedMonth ? selectedMonth.split('-')[0] : '2026';
                      const newMonth = `${curYear}-${e.target.value}`;
                      setSelectedMonth(newMonth);
                      loadExpenses(newMonth);
                    }}
                    className="appearance-none text-xs font-bold pl-3.5 pr-8 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs cursor-pointer"
                  >
                    <option value="01">Januari</option>
                    <option value="02">Februari</option>
                    <option value="03">Maret</option>
                    <option value="04">April</option>
                    <option value="05">Mei</option>
                    <option value="06">Juni</option>
                    <option value="07">Juli</option>
                    <option value="08">Agustus</option>
                    <option value="09">September</option>
                    <option value="10">Oktober</option>
                    <option value="11">November</option>
                    <option value="12">Desember</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
                </div>

                {/* Dropdown Pilihan Tahun */}
                <div className="relative inline-flex items-center">
                  <select
                    value={selectedMonth ? selectedMonth.split('-')[0] : '2026'}
                    onChange={(e) => {
                      const curMonthNum = selectedMonth ? selectedMonth.split('-')[1] : '11';
                      const newMonth = `${e.target.value}-${curMonthNum}`;
                      setSelectedMonth(newMonth);
                      loadExpenses(newMonth);
                    }}
                    className="appearance-none text-xs font-bold pl-3.5 pr-8 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs cursor-pointer"
                  >
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                    <option value="2028">2028</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddExpenseModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Catat Beban Operasional Baru
                </button>
                <button
                  type="button"
                  onClick={() => loadExpenses(selectedMonth)}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-600"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingExpenses ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* 5 EXECUTIVE P&L FINANCIAL CARDS */}
            {pnlData && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">1. Total Omset (Revenue)</p>
                  <p className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                    Rp {Number(pnlData.total_revenue).toLocaleString('id-ID')}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Penjualan faktur aktif</p>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">2. HPP Modal Barang (COGS)</p>
                  <p className="text-lg font-extrabold text-rose-500 mt-1">
                    Rp {Number(pnlData.total_cogs).toLocaleString('id-ID')}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Harga modal pabrik Charm</p>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">3. Laba Kotor (Gross)</p>
                  <p className="text-lg font-extrabold text-emerald-600 mt-1">
                    Rp {Number(pnlData.gross_profit).toLocaleString('id-ID')}
                  </p>
                  <p className="text-[10px] text-emerald-600 font-bold mt-0.5">
                    Margin: {pnlData.gross_margin_pct}%
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">4. Beban Operasional</p>
                  <p className="text-lg font-extrabold text-amber-600 mt-1">
                    Rp {Number(pnlData.total_expenses).toLocaleString('id-ID')}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">BBM, parkir, armada, dll</p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-100">5. Laba Bersih (Net)</p>
                  <p className="text-xl font-extrabold mt-1">
                    Rp {Number(pnlData.net_profit).toLocaleString('id-ID')}
                  </p>
                  <p className="text-[10px] text-emerald-100 font-bold mt-0.5">
                    Net Margin: {pnlData.net_margin_pct}%
                  </p>
                </div>
              </div>
            )}

            {/* BREAKDOWN KATEGORI BIAYA OPERASIONAL */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 border-b pb-2 dark:border-slate-800">
                Breakdown Pengeluaran Operasional Bulan Ini
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {[
                  { key: 'BBM', label: 'BBM Armada & Sales', icon: Fuel },
                  { key: 'PARKIR_RETRIBUSI', label: 'Parkir & Retribusi', icon: MapPin },
                  { key: 'REPARASI_ARMADA', label: 'Servis / Reparasi', icon: Truck },
                  { key: 'GAJI_BONUS', label: 'Gaji & Bonus', icon: DollarSign },
                  { key: 'OPERASIONAL_LAINNYA', label: 'Lain-Lain', icon: Receipt },
                ].map((cat) => {
                  const amt = categoryBreakdown[cat.key] || 0;
                  const Icon = cat.icon;
                  return (
                    <div
                      key={cat.key}
                      className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 space-y-1"
                    >
                      <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                        <Icon className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-bold truncate">{cat.label}</span>
                      </div>
                      <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                        Rp {amt.toLocaleString('id-ID')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TABEL RINCIAN PENGELUARAN BULAN INI */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 border-b pb-2 dark:border-slate-800 flex items-center justify-between">
                <span>Rincian Catatan Pengeluaran ({expensesList.length} Transaksi)</span>
              </h4>

              {expensesList.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl">
                  Belum ada catatan pengeluaran di bulan ini. Klik tombol di atas untuk menambah.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-400 text-[11px]">
                        <th className="p-2.5">No. Dokumen</th>
                        <th className="p-2.5">Tanggal</th>
                        <th className="p-2.5">Kategori</th>
                        <th className="p-2.5">Keterangan / Deskripsi</th>
                        <th className="p-2.5">Diajukan Oleh</th>
                        <th className="p-2.5 text-right">Nominal Pengeluaran</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {expensesList.map((exp) => (
                        <tr key={exp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-950/40">
                          <td className="p-2.5 font-mono font-bold text-emerald-600">{exp.expense_no}</td>
                          <td className="p-2.5 font-mono">{exp.expense_date}</td>
                          <td className="p-2.5 font-bold">
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {exp.category}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-700 dark:text-slate-300 font-semibold">{exp.description}</td>
                          <td className="p-2.5 text-slate-500">{exp.claimed_by_user?.full_name || 'Admin'}</td>
                          <td className="p-2.5 text-right font-extrabold text-slate-900 dark:text-slate-100">
                            Rp {Number(exp.amount).toLocaleString('id-ID')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: INVENTORY & MANAJEMEN MASTER PRODUK */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
              <div>
                <h3 className="font-bold text-sm">Monitoring Stok Gudang & Master Produk</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kelola kode unik (SKU), satuan bertingkat, dan stok fisik riil gudang.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddProductModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <PackagePlus className="w-4 h-4" />
                  Tambah Produk Baru
                </button>

                <button
                  onClick={handleRefreshSnapshot}
                  disabled={refreshingSnapshot}
                  className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                  title="Update acuan stok kemarin untuk sales"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshingSnapshot ? 'animate-spin' : ''}`} />
                  Refresh Snapshot H-1
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden p-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-400 uppercase text-[11px]">
                    <th className="p-3">Kode Unik (SKU)</th>
                    <th className="p-3">Nama Produk</th>
                    <th className="p-3">Satuan & Harga Jual</th>
                    <th className="p-3 text-right">Stok Fisik Gudang</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {inventoryList.map((p) => {
                    const currentStock = p.stock_base_unit || 0;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-950/50">
                        <td className="p-3 font-mono font-bold text-emerald-600">{p.sku}</td>
                        <td className="p-3 font-bold">{p.name}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">
                          {p.units?.map((u: any) => `${u.unit_name}: Rp ${Number(u.price_grosir).toLocaleString('id-ID')}`).join(' | ')}
                        </td>
                        <td className="p-3 text-right font-extrabold text-sm">
                          {currentStock.toLocaleString('id-ID')} PCS
                        </td>
                        <td className="p-3 text-center">
                          {currentStock < 100 ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                              Menipis
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              Aman
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => setEditingProduct(p)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT TRAIL LOGS */}
        {activeTab === 'audit' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden p-4 space-y-3">
            <h3 className="font-bold text-sm">Audit Trail Log (Transparansi Sistem)</h3>
            <p className="text-xs text-slate-500">
              Merekam setiap aktivitas CRUD, pengeditan kuantitas pesanan, persetujuan order, dan penerbitan faktur.
            </p>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-emerald-600">[{log.action_type}]</span>{' '}
                    <span className="font-semibold">{log.module}</span> - {log.notes}
                    <div className="text-[11px] text-slate-400 mt-0.5">Dokumen: {log.record_id}</div>
                  </div>
                  <div className="text-right text-[11px] text-slate-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString('id-ID')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL EDIT ITEM ORDER DENGAN STEPPER SIMETRIS (SESUAI FOTO 2) */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="my-auto w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-base">Sesuaikan Kuantitas Pesanan</h3>
                <p className="text-xs text-slate-500">
                  {editingOrder.order_no} | Toko: {editingOrder.store?.name}
                </p>
              </div>
              <button onClick={() => setEditingOrder(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900">
              💡 Jika stok fisik di gudang kurang dari pesanan toko, sesuaikan kuantitas di bawah ini. Tombol - dan + telah diatur simetris di sebelah kiri dan kanan.
            </p>

            <div className="space-y-3">
              {editItems.map((item, index) => (
                <div
                  key={item.id || index}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2.5 bg-slate-50/50 dark:bg-slate-950/40"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setEditItems(editItems.filter((_, i) => i !== index));
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors shrink-0"
                    title="Hapus Produk dari Pesanan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex-1 pr-1">
                    <div className="font-extrabold text-xs text-slate-900 dark:text-slate-100">{item.product_name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Satuan: {item.unit_name} @ Rp {item.unit_price.toLocaleString('id-ID')}
                    </div>
                  </div>

                  {/* Stepper Simetris: [-] [ Qty ] [+] */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-500 mr-1">Qty:</span>
                    <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => {
                          const newQ = Math.max(0, item.quantity - 1);
                          const updated = [...editItems];
                          updated[index].quantity = newQ;
                          updated[index].total_price = newQ * item.unit_price;
                          setEditItems(updated);
                        }}
                        className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <input
                        type="number"
                        min="0"
                        value={item.quantity}
                        onChange={(e) => {
                          const newQ = Number(e.target.value);
                          const updated = [...editItems];
                          updated[index].quantity = newQ;
                          updated[index].total_price = newQ * item.unit_price;
                          setEditItems(updated);
                        }}
                        className="w-12 h-8 text-center font-extrabold text-xs border-x border-slate-300 dark:border-slate-700 bg-transparent focus:outline-none"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          const newQ = item.quantity + 1;
                          const updated = [...editItems];
                          updated[index].quantity = newQ;
                          updated[index].total_price = newQ * item.unit_price;
                          setEditItems(updated);
                        }}
                        className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-xs font-bold text-slate-500 w-8">{item.unit_name}</span>
                  </div>

                  <div className="w-24 text-right font-extrabold text-xs text-slate-900 dark:text-slate-100">
                    Rp {item.total_price.toLocaleString('id-ID')}
                  </div>
                </div>
              ))}
            </div>

            {/* Form Tambah Produk Baru ke Pesanan Ini (Sesuai Permintaan User) */}
            <div className="p-3 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Produk Lain yang Belum Ada di Pesanan:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                <div className="sm:col-span-5 relative">
                  <select
                    value={selectedAddProductId}
                    onChange={(e) => {
                      setSelectedAddProductId(e.target.value);
                      const p = inventoryList.find((prod) => prod.id === e.target.value);
                      if (p && p.units?.length > 0) {
                        setSelectedAddUnitName(p.units[0].unit_name);
                      }
                    }}
                    className="w-full appearance-none text-xs font-bold pl-3 pr-8 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    {inventoryList.map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.name} ({prod.sku})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <div className="sm:col-span-3 relative">
                  <select
                    value={selectedAddUnitName}
                    onChange={(e) => setSelectedAddUnitName(e.target.value)}
                    className="w-full appearance-none text-xs font-bold pl-3 pr-8 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    {(() => {
                      const p = inventoryList.find((prod) => prod.id === selectedAddProductId);
                      return (p?.units || []).map((u: any) => (
                        <option key={u.id} value={u.unit_name}>
                          {u.unit_name} (@ Rp {Number(u.price_grosir || u.price_ecer).toLocaleString('id-ID')})
                        </option>
                      ));
                    })()}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <div className="sm:col-span-2">
                  <input
                    type="number"
                    min="1"
                    value={addQty}
                    onChange={(e) => setAddQty(Math.max(1, Number(e.target.value)))}
                    placeholder="Qty"
                    className="w-full text-xs font-bold text-center px-2 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={handleAddNewItemToOrder}
                    className="w-full py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah
                  </button>
                </div>
              </div>
            </div>

            {/* Total Pesanan Disesuaikan */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
              <span>Total Pesanan Disesuaikan:</span>
              <span className="text-emerald-600 dark:text-emerald-400 text-sm font-extrabold">
                Rp {editItems.reduce((sum, it) => sum + Number(it.total_price || 0), 0).toLocaleString('id-ID')}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Catatan Penyesuaian Admin:</label>
              <input
                type="text"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="cth: Stok varian night 35cm disesuaikan ke 1 KTN..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEditItems}
                disabled={savingEdit}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                {savingEdit ? 'Menyimpan...' : 'Simpan Revisi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BUAT FAKTUR PEMBELIAN (STOK MASUK) */}
      {isAddPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="my-auto w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <PackagePlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Buat Faktur Pembelian (Stok Masuk)</h3>
                  <p className="text-xs text-slate-500">
                    Mencatat stok masuk dari supplier/toko, otomatis menambah stok gudang & beban modal keluar.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddPurchaseModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">Toko Asal Pembelian / Supplier *</label>
                  <div className="relative">
                    <select
                      value={purchaseForm.store_id}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, store_id: e.target.value })}
                      className="w-full appearance-none px-3 pr-9 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                      required
                    >
                      <option value="">-- Pilih Toko Asal Pembelian --</option>
                      {masterStoresList.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name} ({st.code || st.zone_code})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1">Tanggal Pembelian *</label>
                  <DateDropdownPicker
                    value={purchaseForm.purchase_date}
                    onChange={(d) => setPurchaseForm({ ...purchaseForm, purchase_date: d })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Catatan / No. Surat Jalan (Opsional)</label>
                <input
                  type="text"
                  value={purchaseForm.notes}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
                  placeholder="cth: Pengiriman DO dari Pabrik Charm No. 9812..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none"
                />
              </div>

              {/* Input Item Pembelian Baru */}
              <div className="p-3.5 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2.5">
                <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  + Pilih Produk yang Masuk:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-5 relative">
                    <select
                      id="purchase-prod-select"
                      className="w-full appearance-none text-xs font-bold pl-3 pr-8 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                    >
                      {inventoryList.map((prod) => (
                        <option key={prod.id} value={prod.id}>
                          {prod.name} ({prod.sku})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  <div className="sm:col-span-3 relative">
                    <select
                      id="purchase-unit-select"
                      className="w-full appearance-none text-xs font-bold pl-3 pr-8 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="KTN">KTN (Karton)</option>
                      <option value="BD">BD (Bendit)</option>
                      <option value="PCS">PCS (Satuan)</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  <div className="sm:col-span-2">
                    <input
                      id="purchase-qty-input"
                      type="number"
                      min="1"
                      defaultValue={1}
                      placeholder="Qty"
                      className="w-full text-xs font-bold text-center px-2 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={() => {
                        const prodSelect = document.getElementById('purchase-prod-select') as HTMLSelectElement;
                        const unitSelect = document.getElementById('purchase-unit-select') as HTMLSelectElement;
                        const qtyInput = document.getElementById('purchase-qty-input') as HTMLInputElement;

                        const prodId = prodSelect?.value;
                        const unitName = unitSelect?.value || 'KTN';
                        const qty = Math.max(1, Number(qtyInput?.value) || 1);

                        const prod = inventoryList.find((p) => p.id === prodId);
                        if (!prod) return;

                        const unit = (prod.units || []).find((u: any) => u.unit_name === unitName) || prod.units?.[0];
                        const convQty = unit?.conversion_qty || (unitName === 'KTN' ? 24 : unitName === 'BD' ? 3 : 1);
                        const purchasePrice = unit?.purchase_price || (unitName === 'KTN' ? 60000 : unitName === 'BD' ? 7500 : 2500);

                        const newItem = {
                          product_id: prod.id,
                          product_unit_id: unit?.id || '',
                          product_name: prod.name,
                          unit_name: unitName,
                          quantity: qty,
                          conversion_qty: convQty,
                          unit_price: purchasePrice,
                          total_price: qty * purchasePrice,
                        };

                        setPurchaseForm({
                          ...purchaseForm,
                          items: [...purchaseForm.items, newItem],
                        });
                      }}
                      className="w-full py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambah
                    </button>
                  </div>
                </div>
              </div>

              {/* Daftar Item Pembelian */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Daftar Barang Masuk ({purchaseForm.items.length} Item):
                </div>
                {purchaseForm.items.length === 0 ? (
                  <p className="text-xs text-slate-400 italic p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl text-center">
                    Belum ada produk yang ditambahkan ke faktur pembelian ini.
                  </p>
                ) : (
                  purchaseForm.items.map((it, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/40 text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setPurchaseForm({
                            ...purchaseForm,
                            items: purchaseForm.items.filter((_, i) => i !== idx),
                          });
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex-1">
                        <div className="font-bold">{it.product_name}</div>
                        <div className="text-[11px] text-slate-500">
                          {it.quantity} {it.unit_name} ({it.quantity * it.conversion_qty} PCS) @ Rp {it.unit_price.toLocaleString('id-ID')}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500">Harga Beli Satuan:</span>
                        <input
                          type="number"
                          value={it.unit_price}
                          onChange={(e) => {
                            const newPrice = Number(e.target.value) || 0;
                            const updated = [...purchaseForm.items];
                            updated[idx].unit_price = newPrice;
                            updated[idx].total_price = updated[idx].quantity * newPrice;
                            setPurchaseForm({ ...purchaseForm, items: updated });
                          }}
                          className="w-24 text-right px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 font-bold"
                        />
                      </div>

                      <div className="w-24 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                        Rp {it.total_price.toLocaleString('id-ID')}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Total Pembelian */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
                <span>Total Modal Keluar / Pembelian:</span>
                <span className="text-emerald-600 dark:text-emerald-400 text-base font-extrabold">
                  Rp {purchaseForm.items.reduce((sum, it) => sum + Number(it.total_price || 0), 0).toLocaleString('id-ID')}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddPurchaseModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingPurchase || purchaseForm.items.length === 0}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingPurchase ? 'Menyimpan...' : 'Simpan Faktur & Masukkan Stok'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PRINT PREVIEW 3-PLY CONTINUOUS FORM (SINGLE & BATCH) */}
      {printingOrdersList.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="my-auto w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Printer className="w-4 h-4 text-emerald-600" />
                  Pratinjau Cetak Faktur Continuous Form 3-Ply (Epson LX-310)
                </h3>
                <p className="text-xs text-slate-500">
                  {printingOrdersList.length > 1
                    ? `Mode Batch: Mencetak ${printingOrdersList.length} faktur terpilih sekaligus ke kertas continuous form.`
                    : 'Format Half-Letter (9.5 x 5.5 inch) rangkap 3: Putih (Toko), Pink (Supir), Kuning (Arsip).'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/30"
                >
                  <Printer className="w-4 h-4" />
                  Cetak {printingOrdersList.length > 1 ? `Batch (${printingOrdersList.length})` : 'Sekarang'}
                </button>
                <button onClick={() => setPrintingOrdersList([])} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Render Setiap Faktur Berurutan */}
            <div className="space-y-6 max-h-[70vh] overflow-y-auto p-2 bg-slate-100 dark:bg-slate-950 rounded-xl">
              {printingOrdersList.map((orderItem, oIdx) => (
                <div key={orderItem.id} className="space-y-3 pb-4 border-b border-dashed border-slate-300 dark:border-slate-800">
                  <div className="text-xs font-bold text-slate-500 px-2">
                    Faktur #{oIdx + 1} dari {printingOrdersList.length}: {orderItem.store?.name} ({orderItem.order_no})
                  </div>

                  {/* Lembar 1: Putih */}
                  <ContinuousFormInvoice
                    invoiceNo={`INV-${orderItem.order_no.replace('SO-', '')}`}
                    orderNo={orderItem.order_no}
                    storeName={orderItem.store?.name}
                    storeAddress={orderItem.store?.address}
                    orderDate={orderItem.order_date}
                    dueDate={orderItem.store?.top_days > 0 ? `${orderItem.store.top_days} Hari (TOP)` : 'Tunai'}
                    items={orderItem.items.map((it: any) => ({
                      name: it.product?.name || 'Item',
                      unit_name: it.unit_name,
                      quantity: it.quantity,
                      unit_price: it.unit_price,
                      total_price: it.total_price,
                    }))}
                    grandTotal={orderItem.grand_total}
                    plyType="PUTIH"
                  />

                  {/* Lembar 2: Pink */}
                  <ContinuousFormInvoice
                    invoiceNo={`INV-${orderItem.order_no.replace('SO-', '')}`}
                    orderNo={orderItem.order_no}
                    storeName={orderItem.store?.name}
                    storeAddress={orderItem.store?.address}
                    orderDate={orderItem.order_date}
                    dueDate={orderItem.store?.top_days > 0 ? `${orderItem.store.top_days} Hari (TOP)` : 'Tunai'}
                    items={orderItem.items.map((it: any) => ({
                      name: it.product?.name || 'Item',
                      unit_name: it.unit_name,
                      quantity: it.quantity,
                      unit_price: it.unit_price,
                      total_price: it.total_price,
                    }))}
                    grandTotal={orderItem.grand_total}
                    plyType="PINK"
                  />

                  {/* Lembar 3: Kuning */}
                  <ContinuousFormInvoice
                    invoiceNo={`INV-${orderItem.order_no.replace('SO-', '')}`}
                    orderNo={orderItem.order_no}
                    storeName={orderItem.store?.name}
                    storeAddress={orderItem.store?.address}
                    orderDate={orderItem.order_date}
                    dueDate={orderItem.store?.top_days > 0 ? `${orderItem.store.top_days} Hari (TOP)` : 'Tunai'}
                    items={orderItem.items.map((it: any) => ({
                      name: it.product?.name || 'Item',
                      unit_name: it.unit_name,
                      quantity: it.quantity,
                      unit_price: it.unit_price,
                      total_price: it.total_price,
                    }))}
                    grandTotal={orderItem.grand_total}
                    plyType="KUNING"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH PRODUK BARU */}
      {isAddProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="my-auto w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <PackagePlus className="w-4 h-4 text-emerald-600" />
                  Tambah Produk Baru
                </h3>
                <p className="text-xs text-slate-500">
                  Daftarkan varian Charm baru lengkap dengan Kode Unik (SKU) dan rasio satuan.
                </p>
              </div>
              <button onClick={() => setIsAddProductModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewProduct} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Kode Unik (SKU) *</label>
                  <input
                    type="text"
                    required
                    placeholder="cth: CHR-MAXI-28"
                    value={newProductForm.sku}
                    onChange={(e) => setNewProductForm({ ...newProductForm, sku: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border rounded-xl font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Kategori</label>
                  <input
                    type="text"
                    value={newProductForm.category}
                    onChange={(e) => setNewProductForm({ ...newProductForm, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Nama Produk Lengkap *</label>
                <input
                  type="text"
                  required
                  placeholder="cth: Charm Extra Maxi Wing 28cm"
                  value={newProductForm.name}
                  onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Stok Fisik Awal (dalam PCS)</label>
                <input
                  type="number"
                  min="0"
                  value={newProductForm.initial_stock_pcs}
                  onChange={(e) => setNewProductForm({ ...newProductForm, initial_stock_pcs: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border rounded-xl font-bold"
                />
              </div>

              {/* Satuan Bertingkat */}
              <div className="space-y-2 pt-2 border-t">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Pengaturan Harga & Satuan:</h4>

                {/* Karton (KTN) */}
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>1. Karton (KTN)</span>
                    <div className="flex items-center gap-1 text-[11px]">
                      <span>Isi:</span>
                      <input
                        type="number"
                        min="1"
                        value={newProductForm.ktn_conversion}
                        onChange={(e) => setNewProductForm({ ...newProductForm, ktn_conversion: Number(e.target.value) })}
                        className="w-12 px-1.5 py-0.5 border rounded text-center"
                      />
                      <span>PCS</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500">Harga Grosir:</span>
                      <input
                        type="number"
                        value={newProductForm.ktn_price_grosir}
                        onChange={(e) => setNewProductForm({ ...newProductForm, ktn_price_grosir: Number(e.target.value) })}
                        className="w-full px-2 py-1 text-xs border rounded-lg font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">Harga Ecer:</span>
                      <input
                        type="number"
                        value={newProductForm.ktn_price_ecer}
                        onChange={(e) => setNewProductForm({ ...newProductForm, ktn_price_ecer: Number(e.target.value) })}
                        className="w-full px-2 py-1 text-xs border rounded-lg font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Bendit (BD) */}
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>2. Bendit (BD = isi 3 pcs)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500">Harga Grosir:</span>
                      <input
                        type="number"
                        value={newProductForm.bd_price_grosir}
                        onChange={(e) => setNewProductForm({ ...newProductForm, bd_price_grosir: Number(e.target.value) })}
                        className="w-full px-2 py-1 text-xs border rounded-lg font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">Harga Ecer:</span>
                      <input
                        type="number"
                        value={newProductForm.bd_price_ecer}
                        onChange={(e) => setNewProductForm({ ...newProductForm, bd_price_ecer: Number(e.target.value) })}
                        className="w-full px-2 py-1 text-xs border rounded-lg font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* PCS (Ecer) */}
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>3. Satuan Dasar (PCS)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500">Harga Grosir:</span>
                      <input
                        type="number"
                        value={newProductForm.pcs_price_grosir}
                        onChange={(e) => setNewProductForm({ ...newProductForm, pcs_price_grosir: Number(e.target.value) })}
                        className="w-full px-2 py-1 text-xs border rounded-lg font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">Harga Ecer:</span>
                      <input
                        type="number"
                        value={newProductForm.pcs_price_ecer}
                        onChange={(e) => setNewProductForm({ ...newProductForm, pcs_price_ecer: Number(e.target.value) })}
                        className="w-full px-2 py-1 text-xs border rounded-lg font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddProductModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingNewProduct}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs"
                >
                  {savingNewProduct ? 'Menyimpan...' : 'Simpan Produk Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT MASTER PRODUK */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="my-auto w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-base">Edit Master Produk</h3>
                <p className="text-xs text-slate-500">Ubah kode unik (SKU), nama, dan stok fisik gudang.</p>
              </div>
              <button onClick={() => setEditingProduct(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">Kode Unik (SKU)</label>
                <input
                  type="text"
                  required
                  value={editingProduct.sku}
                  onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border rounded-xl font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Nama Produk</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Penyesuaian Stok Fisik Gudang (PCS)</label>
                <input
                  type="number"
                  min="0"
                  value={editingProduct.stock_base_unit}
                  onChange={(e) => setEditingProduct({ ...editingProduct, stock_base_unit: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border rounded-xl font-extrabold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingEditProduct}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs"
                >
                  {savingEditProduct ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CATAT PELUNASAN PIUTANG ADMIN */}
      {selectedInvoiceForSettlement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="my-auto w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Banknote className="w-5 h-5 text-emerald-600" />
                Catat Pelunasan / Cicilan Piutang
              </h3>
              <button
                type="button"
                onClick={() => setSelectedInvoiceForSettlement(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1 text-xs">
              <div className="font-extrabold text-sm text-emerald-700 dark:text-emerald-400 font-mono">
                {selectedInvoiceForSettlement.invoice_no}
              </div>
              <div className="font-bold text-slate-900 dark:text-slate-100">
                Toko: {selectedInvoiceForSettlement.store?.name}
              </div>
              <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-800">
                <span>Total Faktur: Rp {Number(selectedInvoiceForSettlement.total_amount).toLocaleString('id-ID')}</span>
                <span className="font-extrabold text-rose-600">
                  Sisa: Rp {Number(selectedInvoiceForSettlement.remaining_balance).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveSettlement} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold block mb-1">Nominal Pembayaran Diterima (Rp)</label>
                <input
                  type="number"
                  min="1"
                  max={Number(selectedInvoiceForSettlement.remaining_balance)}
                  value={settlementPayAmount}
                  onChange={(e) => setSettlementPayAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-extrabold"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Metode Setoran</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['TUNAI', 'TRANSFER', 'GIRO'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSettlementPayMethod(m)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        settlementPayMethod === m
                          ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Catatan Setoran / Nomor Rekening</label>
                <input
                  type="text"
                  value={settlementNotes}
                  onChange={(e) => setSettlementNotes(e.target.value)}
                  placeholder="Contoh: Transfer BCA an. Toko Subur / Kasir Toko"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceForSettlement(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingSettlement}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs disabled:opacity-50"
                >
                  {savingSettlement ? 'Menyimpan...' : 'Konfirmasi Setoran Lunas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CATAT BEBAN OPERASIONAL BARU ADMIN */}
      {isAddExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="my-auto w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Fuel className="w-5 h-5 text-emerald-600" />
                Catat Beban Operasional Baru
              </h3>
              <button
                type="button"
                onClick={() => setIsAddExpenseModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewExpense} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold block mb-1">Kategori Pengeluaran</label>
                <div className="relative">
                  <select
                    value={newExpenseForm.category}
                    onChange={(e) => setNewExpenseForm({ ...newExpenseForm, category: e.target.value })}
                    className="w-full appearance-none px-3 pr-9 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="BBM">BBM Armada Truk / Motor Sales</option>
                    <option value="PARKIR_RETRIBUSI">Parkir & Retribusi Pasar</option>
                    <option value="REPARASI_ARMADA">Servis / Reparasi / Ban Armada</option>
                    <option value="GAJI_BONUS">Gaji / Uang Makan / Bonus</option>
                    <option value="OPERASIONAL_LAINNYA">Biaya Operasional Lainnya</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Tanggal Pengeluaran</label>
                <DateDropdownPicker
                  value={newExpenseForm.expense_date}
                  onChange={(d) => setNewExpenseForm({ ...newExpenseForm, expense_date: d })}
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Nominal Biaya (Rp)</label>
                <input
                  type="number"
                  min="500"
                  step="500"
                  value={newExpenseForm.amount}
                  onChange={(e) => setNewExpenseForm({ ...newExpenseForm, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-extrabold"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Keterangan / Rincian Pengeluaran</label>
                <input
                  type="text"
                  value={newExpenseForm.description}
                  onChange={(e) => setNewExpenseForm({ ...newExpenseForm, description: e.target.value })}
                  placeholder="Contoh: Solar Isuzu Giga (G-9812-AA) Muatan Pasar Wage"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddExpenseModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingNewExpense}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs disabled:opacity-50"
                >
                  {savingNewExpense ? 'Menyimpan...' : 'Simpan Pengeluaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* TOAST CONTAINER & CUSTOM MODAL DIALOG */}
      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
      <CustomModalDialog config={modalDialog} onClose={() => setModalDialog(null)} />
    </div>
  );
}
