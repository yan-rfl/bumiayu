'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Truck,
  Store as StoreIcon,
  ShoppingBag,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wifi,
  WifiOff,
  LogOut,
  Plus,
  Minus,
  Trash2,
  Send,
  RefreshCw,
  Search,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  MapPin,
  Sparkles,
  Edit,
  Save,
  UserPlus,
  Smartphone,
  Share2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { offlineDB } from '@/lib/db/offline';
import { ToastContainer, CustomModalDialog, ToastItem, ModalDialogConfig } from '@/components/UIFeedback';

interface StoreItem {
  id: string;
  code: string;
  name: string;
  address: string;
  zone_code: string;
  top_days: number;
  credit_limit: number;
  current_debt: number;
  is_locked: boolean;
}

interface ProductUnitItem {
  id: string;
  unit_name: string;
  conversion_qty: number;
  purchase_price: number;
  price_grosir: number;
  price_ecer: number;
}

interface ProductItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  base_unit: string;
  units: ProductUnitItem[];
  stock_base_unit: number;
  snapshot_stock_h1: number;
}

interface CartItem {
  id?: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  product_unit_id: string;
  unit_name: string;
  conversion_qty: number;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export default function SalesPWAPage() {
  const router = useRouter();
  const [salesUser, setSalesUser] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [activeTab, setActiveTab] = useState<'order' | 'history'>('order');

  // Master Data
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Beat Route Jadwal Hari Ini
  const [todayRoute, setTodayRoute] = useState<any | null>(null);
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [storeRouteFilter, setStoreRouteFilter] = useState<'ROUTE' | 'ALL'>('ROUTE');

  // Form Input Order State
  const [selectedStore, setSelectedStore] = useState<StoreItem | null>(null);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [searchStore, setSearchStore] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Accordion State untuk tiap produk (buka/tutup)
  const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});

  // Modal Daftarkan Toko Baru
  const [isAddStoreModalOpen, setIsAddStoreModalOpen] = useState(false);
  const [newStoreForm, setNewStoreForm] = useState({
    name: '',
    owner_name: '',
    phone_wa: '',
    address: '',
    zone_code: '',
    top_days: 0,
    credit_limit: 0,
  });
  const [savingNewStore, setSavingNewStore] = useState(false);

  // Riwayat Order State
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [historyDayFilter, setHistoryDayFilter] = useState<string>('ALL_7'); // 'ALL_7' or specific YYYY-MM-DD

  // Edit Order State (untuk pesanan yang belum diapprove)
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [editCartItems, setEditCartItems] = useState<CartItem[]>([]);
  const [editOrderNotes, setEditOrderNotes] = useState('');
  const [isConfirmSaveOpen, setIsConfirmSaveOpen] = useState(false);
  const [savingEditOrder, setSavingEditOrder] = useState(false);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showIosInstallModal, setShowIosInstallModal] = useState(false);

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

  // Scroll Lock saat modal terbuka di mobile & desktop (Requirement 3)
  const isAnyModalOpen = Boolean(
    isRouteModalOpen ||
    isStoreModalOpen ||
    isAddStoreModalOpen ||
    editingOrder ||
    isConfirmSaveOpen ||
    showIosInstallModal ||
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

  // Sinyal Online/Offline Listener & PWA Install Listener
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineOrders();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cek apakah sudah running dalam mode PWA standalone
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

      // Cek apakah perangkat iOS
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIos && !isStandalone) {
        setShowInstallBanner(true);
      }

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
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

  // Cek Auth & Load Data
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

      setSalesUser(activeUser);
      await loadMasterData();
      await loadTodayRoute(activeUser.id);
      await loadMyOrders(activeUser.id);
    }
    init();
  }, [router]);

  // Load Jadwal Rute Hari Ini
  const loadTodayRoute = async (userId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/routes?sales_id=${userId}&date=${today}`);
      const json = await res.json();
      if (json.data && json.data.length > 0) {
        setTodayRoute(json.data[0]);
      } else {
        setTodayRoute(null);
      }
    } catch (e) {
      console.warn('Gagal memuat jadwal rute:', e);
    }
  };

  // Load Toko & Produk dari API Server
  const loadMasterData = async () => {
    setLoadingData(true);
    try {
      const resStores = await fetch('/api/master/stores');
      const jsonStores = await resStores.json();
      if (jsonStores.stores && jsonStores.stores.length > 0) {
        setStores(jsonStores.stores);
        await offlineDB.stores.clear();
        await offlineDB.stores.bulkAdd(jsonStores.stores);
      } else {
        const cached = await offlineDB.stores.toArray();
        setStores(cached);
      }

      const resProds = await fetch('/api/master/products');
      const jsonProds = await resProds.json();
      if (jsonProds.products && jsonProds.products.length > 0) {
        setProducts(jsonProds.products);
        await offlineDB.products.clear();
        await offlineDB.products.bulkAdd(jsonProds.products);

        const initialExpanded: Record<string, boolean> = {};
        jsonProds.products.forEach((p: ProductItem, idx: number) => {
          initialExpanded[p.id] = idx === 0;
        });
        setExpandedProductIds(initialExpanded);
      } else {
        const cachedProds = await offlineDB.products.toArray();
        setProducts(cachedProds as any);
      }
    } catch (e) {
      console.warn('Gagal load dari server, membaca dari cache offline:', e);
      const cached = await offlineDB.stores.toArray();
      setStores(cached);
      const cachedProds = await offlineDB.products.toArray();
      setProducts(cachedProds as any);
    } finally {
      setLoadingData(false);
    }
  };

  const loadMyOrders = async (userId: string) => {
    setLoadingOrders(true);
    try {
      const res = await fetch('/api/orders');
      const json = await res.json();
      if (json.data) {
        const myFiltered = json.data.filter((o: any) => o.sales_id === userId);
        setMyOrders(myFiltered);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Sinkronisasi pesanan offline jika internet aktif kembali
  const syncOfflineOrders = async () => {
    try {
      const pending = await offlineDB.pendingOrders.where('is_synced').equals(0).toArray();
      if (pending.length > 0) {
        for (const item of pending) {
          const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.order_data),
          });
          if (res.ok) {
            await offlineDB.pendingOrders.update(item.id!, { is_synced: true });
          }
        }
        if (salesUser) loadMyOrders(salesUser.id);
      }
    } catch (e) {
      console.error('Gagal sync offline orders:', e);
    }
  };

  const toggleProductAccordion = (productId: string) => {
    setExpandedProductIds((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  const getItemInCart = (productId: string, unitId: string): CartItem | undefined => {
    return cart.find((c) => c.product_id === productId && c.product_unit_id === unitId);
  };

  const handleSetProductQty = (product: ProductItem, unit: ProductUnitItem, delta: number) => {
    const existingIndex = cart.findIndex(
      (c) => c.product_id === product.id && c.product_unit_id === unit.id
    );

    const price = Number(unit.price_grosir || unit.price_ecer || 0);

    if (existingIndex > -1) {
      const newQty = cart[existingIndex].quantity + delta;
      if (newQty <= 0) {
        setCart(cart.filter((_, i) => i !== existingIndex));
      } else {
        const updated = [...cart];
        updated[existingIndex].quantity = newQty;
        updated[existingIndex].total_price = newQty * price;
        setCart(updated);
      }
    } else if (delta > 0) {
      setCart([
        ...cart,
        {
          product_id: product.id,
          product_name: product.name,
          product_sku: product.sku,
          product_unit_id: unit.id,
          unit_name: unit.unit_name,
          conversion_qty: unit.conversion_qty,
          quantity: delta,
          unit_price: price,
          total_price: delta * price,
        },
      ]);
    }
  };

  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }
    const updated = [...cart];
    updated[index].quantity = newQty;
    updated[index].total_price = newQty * updated[index].unit_price;
    setCart(updated);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.total_price, 0);
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Submit Sales Order
  const handleSubmitOrder = async () => {
    if (!selectedStore) {
      showToast('Pilih toko pelanggan terlebih dahulu.', 'error');
      return;
    }
    if (cart.length === 0) {
      showToast('Keranjang pesanan masih kosong.', 'error');
      return;
    }

    setSubmitting(true);
    const today = new Date().toISOString().split('T')[0];
    const orderPayload = {
      store_id: selectedStore.id,
      sales_id: salesUser.id,
      delivery_date: today,
      notes: orderNotes,
      subtotal: cartTotal,
      grand_total: cartTotal,
      items: cart.map((item) => ({
        product_id: item.product_id,
        product_unit_id: item.product_unit_id,
        unit_name: item.unit_name,
        quantity: item.quantity,
        conversion_qty: item.conversion_qty,
        unit_price: item.unit_price,
        total_price: item.total_price,
      })),
    };

    try {
      if (isOnline) {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload),
        });
        const json = await res.json();
        if (!res.ok) {
          showToast(json.error || 'Gagal mengirim pesanan.', 'error');
          return;
        }
        const createdNo = json.order?.order_no || json.data?.order_no || 'Pesanan';
        showToast(`Pesanan ${createdNo} berhasil dikirim ke kantor!`, 'success');
        setSuccessMsg(`Pesanan ${createdNo} berhasil dikirim ke kantor!`);
      } else {
        await offlineDB.pendingOrders.add({
          local_order_id: `OFFLINE-${Date.now()}`,
          order_data: orderPayload,
          created_at: new Date().toISOString(),
          is_synced: false,
        });
        showToast('Mode Offline: Pesanan tersimpan di HP dan otomatis sinkron saat online.', 'info');
        setSuccessMsg('Mode Offline: Pesanan tersimpan di HP dan otomatis sinkron saat online.');
      }

      setCart([]);
      setSelectedStore(null);
      setOrderNotes('');
      if (salesUser) loadMyOrders(salesUser.id);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan saat memproses pesanan.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Toko Baru
  const handleSaveNewStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreForm.name || !newStoreForm.address || !newStoreForm.zone_code) {
      showToast('Nama toko, alamat, dan zona wilayah wajib diisi.', 'error');
      return;
    }
    setSavingNewStore(true);
    try {
      const res = await fetch('/api/master/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newStoreForm,
          created_by: salesUser?.id,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal mendaftarkan toko');

      showToast(json.message || 'Toko baru berhasil didaftarkan!', 'success');
      setIsAddStoreModalOpen(false);
      setNewStoreForm({
        name: '',
        owner_name: '',
        phone_wa: '',
        address: '',
        zone_code: '',
        top_days: 0,
        credit_limit: 0,
      });

      // Reload master stores dan otomatis pilih toko baru tsb
      await loadMasterData();
      if (json.store) {
        setSelectedStore(json.store);
        setIsStoreModalOpen(false);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingNewStore(false);
    }
  };

  // Open Edit Order Modal
  const handleOpenEditOrder = (order: any) => {
    setEditingOrder(order);
    setEditOrderNotes(order.admin_notes || '');
    const itemsFormatted: CartItem[] = (order.items || []).map((it: any) => ({
      id: it.id,
      product_id: it.product_id,
      product_name: it.product?.name || it.product_name || 'Produk',
      product_sku: it.product?.sku || '',
      product_unit_id: it.product_unit_id,
      unit_name: it.unit_name,
      conversion_qty: it.conversion_qty || 1,
      quantity: it.quantity,
      unit_price: Number(it.unit_price),
      total_price: Number(it.total_price),
    }));
    setEditCartItems(itemsFormatted);
  };

  const handleUpdateEditQty = (index: number, delta: number) => {
    const updated = [...editCartItems];
    const newQty = updated[index].quantity + delta;
    if (newQty <= 0) {
      updated.splice(index, 1);
    } else {
      updated[index].quantity = newQty;
      updated[index].total_price = newQty * updated[index].unit_price;
    }
    setEditCartItems(updated);
  };

  const handleSaveEditedOrder = async () => {
    if (!editingOrder) return;
    setSavingEditOrder(true);
    try {
      const res = await fetch(`/api/orders/${editingOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'EDIT_ITEMS',
          admin_id: salesUser.id,
          admin_notes: editOrderNotes,
          items: editCartItems,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan revisi');

      showToast(json.message || 'Perubahan pesanan berhasil disimpan!', 'success');
      setIsConfirmSaveOpen(false);
      setEditingOrder(null);
      if (salesUser) loadMyOrders(salesUser.id);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingEditOrder(false);
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

  // Filter Toko & Rute
  const todayRouteZones: string[] = todayRoute?.zone_codes || [];
  const storesInTodayRoute = stores.filter((s) => todayRouteZones.includes(s.zone_code));

  const filteredStores = stores.filter((store) => {
    const matchSearch =
      store.name.toLowerCase().includes(searchStore.toLowerCase()) ||
      store.code.toLowerCase().includes(searchStore.toLowerCase()) ||
      store.zone_code.toLowerCase().includes(searchStore.toLowerCase());

    if (storeRouteFilter === 'ROUTE' && todayRouteZones.length > 0) {
      return matchSearch && todayRouteZones.includes(store.zone_code);
    }
    return matchSearch;
  });

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchProduct.toLowerCase())
  );

  // 7 Hari Terakhir untuk filter riwayat (Maksimal H-7)
  const [last7DaysOptions, setLast7DaysOptions] = useState<{ dateStr: string; label: string }[]>([]);
  const [minDateH7, setMinDateH7] = useState('');

  useEffect(() => {
    const list: { dateStr: string; label: string }[] = [];
    const minD = new Date();
    minD.setDate(minD.getDate() - 7);
    setMinDateH7(minD.toISOString().split('T')[0]);

    for (let i = 0; i < 8; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      const dayName = dayNames[d.getDay()];
      const label =
        i === 0
          ? `Hari Ini (${iso.slice(8, 10)}/${iso.slice(5, 7)})`
          : i === 1
          ? `Kemarin (H-1)`
          : `${dayName}, ${iso.slice(8, 10)}/${iso.slice(5, 7)} (H-${i})`;
      list.push({ dateStr: iso, label });
    }
    setLast7DaysOptions(list);
  }, []);

  const filteredMyOrders = useMemo(() => {
    if (historyDayFilter === 'ALL_7') {
      if (!minDateH7) return myOrders;
      return myOrders.filter((o) => (o.order_date || o.created_at?.slice(0, 10)) >= minDateH7);
    }
    return myOrders.filter((o) => (o.order_date || o.created_at?.slice(0, 10)) === historyDayFilter);
  }, [myOrders, historyDayFilter, minDateH7]);

  const distinctZones = useMemo(() => {
    return Array.from(new Set(stores.map((s) => s.zone_code).filter(Boolean))).sort();
  }, [stores]);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 pb-20">
      {/* HEADER SALES */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-extrabold leading-tight">Sales Lapangan</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {salesUser?.full_name || salesUser?.user_metadata?.full_name || 'BumiAyu Sales'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Sinyal */}
          <span
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${
              isOnline
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800'
                : 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800'
            }`}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-600" /> : <WifiOff className="w-3.5 h-3.5 text-amber-600" />}
            {isOnline ? 'Online' : 'Offline'}
          </span>

          <button
            onClick={handleLogout}
            title="Keluar"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* BANNER INSTALL APLIKASI KE HP SALES */}
      {showInstallBanner && (
        <div className="mx-4 mt-2.5 p-2.5 rounded-2xl bg-slate-900 text-white flex items-center justify-between text-xs shadow-md border border-slate-700 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-xs">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold text-[11px] leading-tight text-white">Install Aplikasi BumiAyu</div>
              <div className="text-[10px] text-slate-300">Pasang di layar HP agar instan & siap offline</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-extrabold text-[10px] text-white transition-colors shadow-xs"
            >
              Install
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

      {/* BANNER RUTE HARI INI (KETUK UNTUK LIHAT POPUP SELURUH RUTE) */}
      {todayRoute && (
        <div
          onClick={() => setIsRouteModalOpen(true)}
          className="mx-4 mt-2.5 p-3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl shadow-xs flex items-center justify-between text-xs cursor-pointer hover:opacity-95 transition-opacity"
        >
          <div className="flex items-center gap-2 truncate pr-2">
            <MapPin className="w-4 h-4 shrink-0 text-emerald-200" />
            <div className="truncate">
              <span className="font-extrabold">Rute Hari Ini: </span>
              <span className="font-semibold text-emerald-100">
                {todayRouteZones.length} Wilayah ({storesInTodayRoute.length} Toko)
              </span>
              <span className="text-[10px] text-emerald-200 block">Ketuk untuk lihat detail rute &gt;</span>
            </div>
          </div>
          <span className="shrink-0 px-2.5 py-1 rounded-full bg-white/20 text-[10px] font-extrabold backdrop-blur-xs">
            Lihat Rute
          </span>
        </div>
      )}

      {/* Tabs Navigasi Mobile (2 Menu: Order & Riwayat) */}
      <div className="grid grid-cols-2 p-1.5 mx-4 mt-3 bg-slate-200/80 dark:bg-slate-900 rounded-2xl gap-1 text-sm font-bold">
        <button
          onClick={() => setActiveTab('order')}
          className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'order'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Input Order Toko</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Riwayat ({myOrders.length})</span>
        </button>
      </div>

      {/* NOTIFIKASI SUKSES */}
      {successMsg && (
        <div className="mx-4 mt-3 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm flex items-start gap-2 shadow-sm animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
          <span className="leading-relaxed font-semibold">{successMsg}</span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 1: INPUT ORDER                                                  */}
      {/* ==================================================================== */}
      {activeTab === 'order' && (
        <div className="px-4 py-3 space-y-4 max-w-lg mx-auto">
          {/* KARTU 1: PILIH TOKO PELANGGAN */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <StoreIcon className="w-4 h-4 text-emerald-600" />
                1. Toko Pelanggan
              </h2>
              {selectedStore && (
                <button
                  type="button"
                  onClick={() => setIsStoreModalOpen(true)}
                  className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-extrabold hover:underline"
                >
                  Ganti Toko
                </button>
              )}
            </div>

            {!selectedStore ? (
              <button
                type="button"
                onClick={() => setIsStoreModalOpen(true)}
                className="w-full py-4 px-4 rounded-2xl border-2 border-dashed border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 flex items-center justify-between text-sm font-extrabold hover:bg-emerald-50 transition-colors shadow-2xs"
              >
                <span className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-emerald-600" />
                  {todayRouteZones.length > 0
                    ? `Pilih Toko (${storesInTodayRoute.length} Rute Hari Ini)`
                    : `Klik untuk Pilih Toko (${stores.length} Terdaftar)`}
                </span>
                <ChevronDown className="w-4 h-4 text-emerald-600" />
              </button>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-extrabold text-base text-emerald-950 dark:text-emerald-200 leading-snug">
                    {selectedStore.name}
                  </h3>
                  <span className="text-xs px-3 py-1 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 font-extrabold whitespace-nowrap shrink-0">
                    {selectedStore.zone_code}
                  </span>
                </div>

                {todayRouteZones.includes(selectedStore.zone_code) && (
                  <div>
                    <span className="inline-block text-xs px-3 py-0.5 rounded-full bg-emerald-600 text-white font-extrabold whitespace-nowrap shadow-2xs">
                      ⭐ Rute Hari Ini
                    </span>
                  </div>
                )}

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">{selectedStore.address}</p>

                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-semibold">
                  <span className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    TOP: {selectedStore.top_days === 0 ? 'Tunai / COD (0-day)' : `${selectedStore.top_days} Hari`}
                  </span>
                  {selectedStore.is_locked ? (
                    <span className="px-2.5 py-1 rounded-xl bg-rose-100 text-rose-800 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Akun Terkunci (Order Tertahan)
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                      {selectedStore.credit_limit > 0
                        ? `Plafon: Rp ${Number(selectedStore.credit_limit).toLocaleString('id-ID')}`
                        : 'Khusus Tunai'}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* KARTU 2: KATALOG PRODUK CHARM (TANPA JADWAL KIRIM) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                2. Katalog Produk Charm & Satuan
              </h2>
              <span className="text-xs text-slate-400 font-semibold">
                {filteredProducts.length} Varian
              </span>
            </div>

            {/* Field Pencarian Produk */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                placeholder="Cari nama produk / kode SKU Charm..."
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            {loadingData ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Memuat katalog produk Charm...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Produk tidak ditemukan.
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredProducts.map((prod) => {
                  const isExpanded = !!expandedProductIds[prod.id];
                  const allCartItemsForThisProduct = cart.filter((c) => c.product_id === prod.id);
                  const totalUnitsInCart = allCartItemsForThisProduct.reduce((sum, it) => sum + it.quantity, 0);

                  return (
                    <div
                      key={prod.id}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs transition-all"
                    >
                      {/* HEADER PRODUK */}
                      <div
                        onClick={() => toggleProductAccordion(prod.id)}
                        className="p-3.5 cursor-pointer bg-slate-50/70 dark:bg-slate-950/60 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 flex items-center justify-between gap-2.5 transition-colors"
                      >
                        <div className="flex-1 pr-1">
                          <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 leading-snug">
                            {prod.name}
                          </h4>
                          <div className="flex items-center gap-2.5 mt-0.5">
                            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold font-mono">
                              {prod.sku}
                            </span>
                            <span className="text-xs text-slate-400 font-semibold">
                              Stok H-1: {prod.snapshot_stock_h1} PCS
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {totalUnitsInCart > 0 && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-600 text-white shadow-2xs">
                              {totalUnitsInCart} Dipilih
                            </span>
                          )}

                          <div className="w-7 h-7 rounded-lg bg-slate-200/70 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>

                      {/* ISI DROPDOWN PRODUK (STEPPER DENGAN TOMBOL HAPUS DI KIRI) */}
                      {isExpanded && (
                        <div className="p-3 space-y-2 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                          {prod.units.map((unit) => {
                            const itemInCart = getItemInCart(prod.id, unit.id);
                            const currentQty = itemInCart ? itemInCart.quantity : 0;
                            const price = Number(unit.price_grosir || unit.price_ecer || 0);

                            return (
                              <div
                                key={unit.id}
                                className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                                  currentQty > 0
                                    ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30'
                                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20'
                                }`}
                              >
                                <div className="flex-1 pr-1">
                                  <div className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                    <span>{unit.unit_name}</span>
                                    <span className="text-xs font-normal text-slate-400">
                                      ({unit.conversion_qty} pcs)
                                    </span>
                                  </div>
                                  <div className="text-xs sm:text-sm font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5">
                                    Rp {price.toLocaleString('id-ID')}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  {currentQty > 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => handleSetProductQty(prod, unit, -currentQty)}
                                      title="Hapus satuan ini"
                                      className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  ) : (
                                    <div className="w-8 h-8" />
                                  )}

                                  <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
                                    <button
                                      type="button"
                                      onClick={() => handleSetProductQty(prod, unit, -1)}
                                      disabled={currentQty === 0}
                                      className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-25 disabled:cursor-not-allowed transition-colors font-bold text-base"
                                    >
                                      <Minus className="w-4 h-4" />
                                    </button>

                                    <div className="w-9 text-center font-extrabold text-sm sm:text-base">
                                      {currentQty}
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => handleSetProductQty(prod, unit, 1)}
                                      className="w-9 h-9 flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors text-base"
                                    >
                                      <Plus className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* KARTU 3: RINGKASAN ORDER / KERANJANG */}
          {cart.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-emerald-500/50 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b pb-2 dark:border-slate-800">
                <h3 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-emerald-600" />
                  Ringkasan Pesanan ({totalItemCount} Item)
                </h3>
                <span className="text-xs text-slate-400">
                  {cart.length} Satuan
                </span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {cart.map((item, idx) => (
                  <div
                    key={`${item.product_id}-${item.product_unit_id}`}
                    className="flex items-center justify-between text-xs py-2 border-b border-slate-100 dark:border-slate-800 last:border-0"
                  >
                    <div className="flex-1 pr-2">
                      <div className="font-extrabold text-slate-800 dark:text-slate-200">
                        {item.product_name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold">
                        {item.unit_name} @ Rp {item.unit_price.toLocaleString('id-ID')}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => removeFromCart(idx)}
                        title="Hapus dari pesanan"
                        className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-950">
                        <button
                          type="button"
                          onClick={() => updateQuantity(idx, item.quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-bold transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-extrabold">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(idx, item.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="w-20 text-right font-extrabold text-xs">
                        Rp {item.total_price.toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Catatan & Kirim */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                <input
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Catatan pesanan untuk kantor (opsional)..."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                />

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900">
                  <span className="text-sm font-bold text-emerald-900 dark:text-emerald-300">
                    Grand Total:
                  </span>
                  <span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400">
                    Rp {cartTotal.toLocaleString('id-ID')}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSubmitOrder}
                  disabled={submitting}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm sm:text-base shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    'Mengirim Pesanan...'
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Kirim Pesanan ke Kantor ({totalItemCount} Item)
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: RIWAYAT PESANAN SALES (MAKSIMAL H-7 + FITUR EDIT PESANAN)      */}
      {/* ==================================================================== */}
      {activeTab === 'history' && (
        <div className="px-4 py-3 space-y-3 max-w-lg mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5 dark:border-slate-800">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Riwayat Pesanan Saya
              </h2>
              <p className="text-[10px] text-slate-400">Maksimal 7 hari terakhir (H-0 s/d H-7)</p>
            </div>

            <div className="flex items-center gap-2">
              {/* Dropdown Filter Hari */}
              <div className="relative inline-flex items-center">
                <select
                  value={historyDayFilter}
                  onChange={(e) => setHistoryDayFilter(e.target.value)}
                  className="appearance-none text-xs font-bold pl-3 pr-8 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs cursor-pointer"
                >
                  <option value="ALL_7">Semua (7 Hari Terakhir)</option>
                  {last7DaysOptions.map((opt) => (
                    <option key={opt.dateStr} value={opt.dateStr}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
              </div>

              <button
                onClick={() => salesUser && loadMyOrders(salesUser.id)}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingOrders ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {loadingOrders ? (
            <p className="text-xs text-slate-500 py-6 text-center">Memuat riwayat...</p>
          ) : filteredMyOrders.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
              Tidak ada pesanan pada filter hari ini.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMyOrders.map((order) => {
                const canEdit = order.status === 'SUBMITTED' || order.status === 'PENDING_PAYMENT';

                return (
                  <div
                    key={order.id}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs sm:text-sm text-emerald-600 font-mono">
                        {order.order_no}
                      </span>
                      <span
                        className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                          order.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : order.status === 'PENDING_PAYMENT'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>

                    <div>
                      <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
                        {order.store?.name}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Tgl Order: {order.order_date || order.created_at?.slice(0, 10)}
                      </div>
                    </div>

                    {/* Ringkasan Item */}
                    <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                      {(order.items || []).map((it: any) => (
                        <div key={it.id} className="flex justify-between py-0.5">
                          <span>
                            {it.product?.name || it.product_name} ({it.quantity} {it.unit_name})
                          </span>
                          <span className="font-bold">
                            Rp {Number(it.total_price).toLocaleString('id-ID')}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-xs text-slate-400 block">Total Pesanan:</span>
                        <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                          Rp {Number(order.grand_total).toLocaleString('id-ID')}
                        </span>
                      </div>

                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => handleOpenEditOrder(order)}
                          className="h-8 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-slate-300 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Edit Pesanan
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 font-semibold italic">
                          Sudah Diapprove (Terkunci)
                        </span>
                      )}
                    </div>

                    {order.hold_reason && (
                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-[10px] text-rose-800 dark:text-rose-300 leading-relaxed">
                        ⚠️ Alasan Ditahan: {order.hold_reason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL POPUP RUTE HARI INI (KETIKA BANNER DI-TAP)                    */}
      {/* ==================================================================== */}
      {isRouteModalOpen && todayRoute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="my-auto w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                Detail Rute Hari Ini
              </h3>
              <button
                type="button"
                onClick={() => setIsRouteModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Wilayah / Zona Terjadwal
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {todayRouteZones.map((z) => (
                    <span
                      key={z}
                      className="px-2.5 py-1 rounded-xl text-xs font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                    >
                      {z}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Daftar Toko Pada Rute Ini ({storesInTodayRoute.length} Toko)
                </span>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {storesInTodayRoute.map((st) => (
                    <div
                      key={st.id}
                      className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs flex justify-between items-center"
                    >
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-200">{st.name}</div>
                        <div className="text-[10px] text-slate-400">{st.address}</div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-emerald-600">{st.zone_code}</span>
                    </div>
                  ))}
                </div>
              </div>

              {todayRoute.notes && (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300">
                  <span className="font-bold block mb-0.5">Catatan Kantor:</span>
                  {todayRoute.notes}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsRouteModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL PILIH TOKO PELANGGAN + TOMBOL DAFTARKAN TOKO BARU              */}
      {/* ==================================================================== */}
      {isStoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="my-auto w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 space-y-3.5 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <StoreIcon className="w-4 h-4 text-emerald-600" />
                Pilih Toko Pelanggan
              </h3>
              <button
                type="button"
                onClick={() => setIsStoreModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tombol Tambah Toko Baru Saat Kunjungan */}
            <button
              type="button"
              onClick={() => setIsAddStoreModalOpen(true)}
              className="w-full py-2.5 px-3 rounded-xl border border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-2xs hover:bg-emerald-100 transition-colors"
            >
              <UserPlus className="w-4 h-4 text-emerald-600" />
              + Daftarkan Toko Baru Saat Kunjungan
            </button>

            {/* Toggle Filter: Rute Hari Ini vs Semua Toko */}
            {todayRouteZones.length > 0 && (
              <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl gap-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setStoreRouteFilter('ROUTE')}
                  className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    storeRouteFilter === 'ROUTE'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Rute Hari Ini ({storesInTodayRoute.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStoreRouteFilter('ALL')}
                  className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    storeRouteFilter === 'ALL'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Semua Toko ({stores.length})
                </button>
              </div>
            )}

            {/* Input Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                autoFocus
                value={searchStore}
                onChange={(e) => setSearchStore(e.target.value)}
                placeholder="Ketik nama toko atau wilayah..."
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            {/* List Toko (Rapi tanpa pemotongan badge) */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredStores.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <p className="text-sm text-slate-400">
                    Tidak ada toko pada filter ini.
                  </p>
                  {storeRouteFilter === 'ROUTE' && (
                    <button
                      type="button"
                      onClick={() => setStoreRouteFilter('ALL')}
                      className="text-xs sm:text-sm font-bold text-emerald-600 hover:underline"
                    >
                      Tampilkan Semua Toko ({stores.length})
                    </button>
                  )}
                </div>
              ) : (
                filteredStores.map((store) => {
                  const isTodayRouteStore = todayRouteZones.includes(store.zone_code);

                  return (
                    <div
                      key={store.id}
                      onClick={() => {
                        setSelectedStore(store);
                        setIsStoreModalOpen(false);
                      }}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        isTodayRouteStore
                          ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50/70'
                          : 'border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 leading-snug">
                          {store.name}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isTodayRouteStore && (
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-extrabold whitespace-nowrap shadow-2xs">
                              ⭐ Rute Hari Ini
                            </span>
                          )}
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 font-bold whitespace-nowrap">
                            {store.zone_code}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{store.address}</p>
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/60 text-xs font-semibold">
                        <span className="text-slate-600 dark:text-slate-400">
                          TOP: {store.top_days === 0 ? 'Tunai (0-day)' : `${store.top_days} Hari`}
                        </span>
                        {store.is_locked ? (
                          <span className="text-rose-600 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> Terkunci
                          </span>
                        ) : store.current_debt > 0 ? (
                          <span className="text-amber-600 font-bold">
                            Piutang: Rp {Number(store.current_debt).toLocaleString('id-ID')}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Lancar
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL DAFTARKAN TOKO BARU                                           */}
      {/* ==================================================================== */}
      {isAddStoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="my-auto w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-600" />
                Pendaftaran Toko Baru
              </h3>
              <button
                type="button"
                onClick={() => setIsAddStoreModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewStore} className="space-y-3">
              <div>
                <label className="text-xs font-bold block mb-1">Nama Toko Pelanggan *</label>
                <input
                  type="text"
                  required
                  value={newStoreForm.name}
                  onChange={(e) => setNewStoreForm({ ...newStoreForm, name: e.target.value })}
                  placeholder="Contoh: Toko Maju Jaya"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Nama Pemilik Toko</label>
                <input
                  type="text"
                  value={newStoreForm.owner_name}
                  onChange={(e) => setNewStoreForm({ ...newStoreForm, owner_name: e.target.value })}
                  placeholder="Contoh: Bu Hj. Siti"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">No. WhatsApp / HP</label>
                <input
                  type="text"
                  value={newStoreForm.phone_wa}
                  onChange={(e) => setNewStoreForm({ ...newStoreForm, phone_wa: e.target.value })}
                  placeholder="Contoh: 081234567890"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Alamat Lengkap Toko *</label>
                <textarea
                  required
                  rows={2}
                  value={newStoreForm.address}
                  onChange={(e) => setNewStoreForm({ ...newStoreForm, address: e.target.value })}
                  placeholder="Contoh: Jl. Pasar Larangan No. 12, Brebes"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Zona Wilayah / Pasar *</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <select
                      value={newStoreForm.zone_code}
                      onChange={(e) => setNewStoreForm({ ...newStoreForm, zone_code: e.target.value })}
                      className="w-full appearance-none px-3 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold focus:outline-none cursor-pointer"
                    >
                      <option value="">-- Pilih Wilayah / Ketik Manual --</option>
                      {distinctZones.map((z) => (
                        <option key={z} value={z}>
                          {z}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                <input
                  type="text"
                  value={newStoreForm.zone_code}
                  onChange={(e) => setNewStoreForm({ ...newStoreForm, zone_code: e.target.value.toUpperCase() })}
                  placeholder="Atau ketik kode zona baru (cth: Z-PASAR-BARU)..."
                  className="w-full mt-1.5 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono uppercase"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Tipe Pembayaran (TOP)</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Tunai / COD', days: 0 },
                    { label: 'TOP 7 Hari', days: 7 },
                    { label: 'TOP 14 Hari', days: 14 },
                  ].map((top) => (
                    <button
                      key={top.days}
                      type="button"
                      onClick={() => setNewStoreForm({ ...newStoreForm, top_days: top.days })}
                      className={`py-2 text-[11px] font-bold rounded-xl border transition-all ${
                        newStoreForm.top_days === top.days
                          ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600'
                      }`}
                    >
                      {top.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddStoreModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingNewStore}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs disabled:opacity-50"
                >
                  {savingNewStore ? 'Mendaftarkan...' : 'Daftarkan Toko'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL EDIT PESANAN SALES (STATUS: SUBMITTED / PENDING_PAYMENT)       */}
      {/* ==================================================================== */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="my-auto w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Edit className="w-4 h-4 text-emerald-600" />
                  Edit Pesanan {editingOrder.order_no}
                </h3>
                <p className="text-[11px] text-slate-400">Toko: {editingOrder.store?.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {editCartItems.map((item, idx) => (
                <div
                  key={`${item.product_id}-${item.product_unit_id}`}
                  className="flex items-center justify-between text-xs py-2 border-b border-slate-100 dark:border-slate-800 last:border-0"
                >
                  <div className="flex-1 pr-2">
                    <div className="font-extrabold text-slate-800 dark:text-slate-200">
                      {item.product_name}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {item.unit_name} @ Rp {item.unit_price.toLocaleString('id-ID')}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateEditQty(idx, -item.quantity)}
                      title="Hapus item"
                      className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-950">
                      <button
                        type="button"
                        onClick={() => handleUpdateEditQty(idx, -1)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-slate-200 text-xs font-bold"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-xs font-extrabold">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateEditQty(idx, 1)}
                        className="w-7 h-7 flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="w-20 text-right font-extrabold text-xs">
                      Rp {item.total_price.toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Catatan Revisi untuk Kantor
              </label>
              <input
                type="text"
                value={editOrderNotes}
                onChange={(e) => setEditOrderNotes(e.target.value)}
                placeholder="cth: Revisi toko minta kurangi 1 karton..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900">
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">Grand Total Baru:</span>
              <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-400">
                Rp {editCartItems.reduce((s, it) => s + it.total_price, 0).toLocaleString('id-ID')}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmSaveOpen(true)}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                Simpan Revisi Pesanan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP KONFIRMASI SIMPAN PERUBAHAN PESANAN SALES */}
      {isConfirmSaveOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="my-auto w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 space-y-3.5 text-center animate-in fade-in zoom-in-95">
            <div className="w-11 h-11 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/80 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
              Konfirmasi Perubahan Pesanan?
            </h4>
            <p className="text-xs text-slate-500">
              Pesanan <span className="font-bold text-emerald-600">{editingOrder?.order_no}</span> akan diperbarui dengan item dan total baru.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmSaveOpen(false)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEditedOrder}
                disabled={savingEditOrder}
                className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs disabled:opacity-50"
              >
                {savingEditOrder ? 'Menyimpan...' : 'Ya, Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                  Ketuk tombol <strong>Tambah</strong> di pojok kanan atas. Aplikasi akan langsung muncul di layar HP Anda!
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

      {/* TOAST CONTAINER & CUSTOM MODAL DIALOG */}
      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
      <CustomModalDialog config={modalDialog} onClose={() => setModalDialog(null)} />
    </div>
  );
}
