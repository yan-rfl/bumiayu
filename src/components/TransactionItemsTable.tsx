'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Trash2, Search, ChevronDown, Package, Check } from 'lucide-react';

export interface TransactionItemRow {
  id?: string; // id item jika dalam mode edit pesanan lama
  product_id: string;
  product_unit_id?: string;
  sku?: string;
  product_name: string;
  unit_name: string;
  quantity: number;
  conversion_qty: number;
  unit_price: number;
  total_price: number;
}

interface TransactionItemsTableProps {
  items: TransactionItemRow[];
  inventoryProducts: any[];
  type: 'PURCHASE' | 'SALE';
  onChange: (items: TransactionItemRow[]) => void;
  disabled?: boolean;
}

export default function TransactionItemsTable({
  items,
  inventoryProducts,
  type,
  onChange,
  disabled = false,
}: TransactionItemsTableProps) {
  // Quick Search state untuk menambah baris produk
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Filter produk berdasarkan SKU atau Nama
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return inventoryProducts.slice(0, 15);
    const q = searchQuery.toLowerCase().trim();
    return inventoryProducts.filter((p) => {
      const matchSku = (p.sku || '').toLowerCase().includes(q);
      const matchName = (p.name || '').toLowerCase().includes(q);
      return matchSku || matchName;
    });
  }, [inventoryProducts, searchQuery]);

  // Click outside listener untuk search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Tambah produk ke tabel
  const handleAddProduct = (prod: any) => {
    // Ambil unit pertama atau KTN
    const units = prod.units || [];
    const defaultUnit = units.find((u: any) => u.unit_name === 'KTN') || units[0] || {
      unit_name: 'KTN',
      conversion_qty: 24,
      purchase_price: 60000,
      price_grosir: 72000,
    };

    const convQty = Number(defaultUnit.conversion_qty) || 1;
    const defaultPrice = type === 'PURCHASE'
      ? Number(defaultUnit.purchase_price || 60000)
      : Number(defaultUnit.price_grosir || defaultUnit.price_ecer || 72000);

    const newRow: TransactionItemRow = {
      product_id: prod.id,
      product_unit_id: defaultUnit.id || '',
      sku: prod.sku || '',
      product_name: prod.name,
      unit_name: defaultUnit.unit_name,
      quantity: 1,
      conversion_qty: convQty,
      unit_price: defaultPrice,
      total_price: defaultPrice * 1,
    };

    onChange([...items, newRow]);
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  // Hapus baris dari tabel
  const handleRemoveRow = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    onChange(updated);
  };

  // Ubah produk pada baris tertentu
  const handleChangeProduct = (index: number, newProdId: string) => {
    const prod = inventoryProducts.find((p) => p.id === newProdId);
    if (!prod) return;

    const units = prod.units || [];
    const defaultUnit = units.find((u: any) => u.unit_name === 'KTN') || units[0] || {
      unit_name: 'KTN',
      conversion_qty: 24,
      purchase_price: 60000,
      price_grosir: 72000,
    };

    const convQty = Number(defaultUnit.conversion_qty) || 1;
    const defaultPrice = type === 'PURCHASE'
      ? Number(defaultUnit.purchase_price || 60000)
      : Number(defaultUnit.price_grosir || defaultUnit.price_ecer || 72000);

    const updated = [...items];
    const currentQty = updated[index].quantity || 1;
    updated[index] = {
      ...updated[index],
      product_id: prod.id,
      product_unit_id: defaultUnit.id || '',
      sku: prod.sku || '',
      product_name: prod.name,
      unit_name: defaultUnit.unit_name,
      conversion_qty: convQty,
      unit_price: defaultPrice,
      total_price: currentQty * defaultPrice,
    };
    onChange(updated);
  };

  // Ubah Satuan pada baris tertentu
  const handleChangeUnit = (index: number, newUnitName: string) => {
    const row = items[index];
    const prod = inventoryProducts.find((p) => p.id === row.product_id);
    const units = prod?.units || [];
    const unitObj = units.find((u: any) => u.unit_name === newUnitName);

    const convQty = unitObj ? Number(unitObj.conversion_qty) || 1 : (newUnitName === 'KTN' ? 24 : newUnitName === 'BD' ? 3 : 1);
    const autoPrice = unitObj
      ? (type === 'PURCHASE' ? Number(unitObj.purchase_price || 0) : Number(unitObj.price_grosir || unitObj.price_ecer || 0))
      : row.unit_price;

    const updated = [...items];
    updated[index] = {
      ...updated[index],
      unit_name: newUnitName,
      product_unit_id: unitObj?.id || updated[index].product_unit_id,
      conversion_qty: convQty,
      unit_price: autoPrice > 0 ? autoPrice : updated[index].unit_price,
      total_price: updated[index].quantity * (autoPrice > 0 ? autoPrice : updated[index].unit_price),
    };
    onChange(updated);
  };

  // Ubah Quantity
  const handleChangeQty = (index: number, newQty: number) => {
    const q = Math.max(1, newQty || 1);
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      quantity: q,
      total_price: q * updated[index].unit_price,
    };
    onChange(updated);
  };

  // Ubah Harga Satuan
  const handleChangePrice = (index: number, newPrice: number) => {
    const p = Math.max(0, newPrice || 0);
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      unit_price: p,
      total_price: updated[index].quantity * p,
    };
    onChange(updated);
  };

  // Hitung Grand Total
  const grandTotal = useMemo(() => {
    return items.reduce((sum, it) => sum + Number(it.total_price || 0), 0);
  }, [items]);

  const totalPcs = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.quantity || 0) * (Number(it.conversion_qty) || 1)), 0);
  }, [items]);

  return (
    <div className="space-y-3">
      {/* Search Input Bar untuk Tambah Produk */}
      {!disabled && (
        <div ref={searchContainerRef} className="relative">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                placeholder="+ Cari ID Produk (SKU) atau Nama Produk untuk ditambahkan ke tabel..."
                className="w-full pl-9 pr-8 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Autocomplete Dropdown */}
          {isSearchOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-95 duration-100 p-1">
              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 italic">
                  Produk dengan SKU/Nama "{searchQuery}" tidak ditemukan.
                </div>
              ) : (
                searchResults.map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => handleAddProduct(prod)}
                    className="p-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer transition-colors flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Package className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
                        <div className="font-extrabold text-slate-900 dark:text-slate-100 truncate">
                          {prod.name}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{prod.sku}</span>
                          <span>•</span>
                          <span>Stok: {prod.stock_base_unit || 0} PCS</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shrink-0 shadow-2xs"
                    >
                      + Tambah
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Tabel Rincian Produk (Sesuai Poin 1.b) */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs bg-white dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-3 text-center w-12">Aksi</th>
                <th className="py-2.5 px-3 min-w-[120px]">ID Produk (SKU)</th>
                <th className="py-2.5 px-3 min-w-[200px]">Nama Produk</th>
                <th className="py-2.5 px-3 min-w-[170px] text-center">Quantity & Satuan</th>
                <th className="py-2.5 px-3 min-w-[130px] text-right">Harga Satuan (Rp)</th>
                <th className="py-2.5 px-3 min-w-[130px] text-right">Subtotal (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400 italic">
                    Belum ada baris produk. Gunakan pencarian di atas untuk menambahkan produk ke tabel.
                  </td>
                </tr>
              ) : (
                items.map((row, idx) => {
                  const currentProd = inventoryProducts.find((p) => p.id === row.product_id);
                  const availableUnits = currentProd?.units || [
                    { unit_name: row.unit_name || 'KTN', conversion_qty: row.conversion_qty || 24 },
                  ];

                  return (
                    <tr
                      key={row.id || `${row.product_id}-${idx}`}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-950/40 transition-colors"
                    >
                      {/* Tombol Hapus Baris */}
                      <td className="py-2 px-3 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          disabled={disabled}
                          title="Hapus baris ini"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors disabled:opacity-40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>

                      {/* ID Produk (SKU) - Searchable / Selectable */}
                      <td className="py-2 px-3 align-middle">
                        <select
                          value={row.product_id}
                          onChange={(e) => handleChangeProduct(idx, e.target.value)}
                          disabled={disabled}
                          className="w-full text-xs font-mono font-extrabold text-emerald-700 dark:text-emerald-400 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                        >
                          {inventoryProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.sku}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Nama Produk - Editable dropdown */}
                      <td className="py-2 px-3 align-middle">
                        <select
                          value={row.product_id}
                          onChange={(e) => handleChangeProduct(idx, e.target.value)}
                          disabled={disabled}
                          className="w-full text-xs font-bold text-slate-900 dark:text-slate-100 bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-lg p-1 cursor-pointer truncate"
                        >
                          {inventoryProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Quantity & Pilihan Satuan (Poin 1.b) */}
                      <td className="py-2 px-3 align-middle">
                        <div className="flex items-center justify-center gap-1.5">
                          <input
                            type="number"
                            min="1"
                            value={row.quantity}
                            onChange={(e) => handleChangeQty(idx, Number(e.target.value))}
                            disabled={disabled}
                            className="w-16 px-2 py-1 text-xs font-extrabold text-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />

                          <div className="relative">
                            <select
                              value={row.unit_name}
                              onChange={(e) => handleChangeUnit(idx, e.target.value)}
                              disabled={disabled}
                              className="appearance-none pl-2.5 pr-6 py-1 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                            >
                              {availableUnits.map((u: any, uIdx: number) => (
                                <option key={u.id || uIdx} value={u.unit_name}>
                                  {u.unit_name} ({u.conversion_qty} pcs)
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>
                      </td>

                      {/* Harga Satuan (Editable) */}
                      <td className="py-2 px-3 text-right align-middle">
                        <input
                          type="number"
                          min="0"
                          value={row.unit_price}
                          onChange={(e) => handleChangePrice(idx, Number(e.target.value))}
                          disabled={disabled}
                          className="w-28 px-2.5 py-1 text-xs font-bold text-right rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>

                      {/* Subtotal (Quantity * Harga Satuan) */}
                      <td className="py-2 px-3 text-right align-middle font-extrabold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                        Rp {Number(row.total_price || 0).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Footer Table (Poin 1.c: Total dari pesanan) */}
            <tfoot>
              <tr className="bg-slate-100 dark:bg-slate-950 border-t-2 border-slate-200 dark:border-slate-800 font-bold text-xs">
                <td colSpan={3} className="py-3 px-4 text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <span>Total Barang: <strong className="text-slate-900 dark:text-slate-100">{items.length} Macam</strong></span>
                    <span>•</span>
                    <span>Akumulasi: <strong className="text-slate-900 dark:text-slate-100">{totalPcs.toLocaleString('id-ID')} PCS</strong></span>
                  </div>
                </td>
                <td colSpan={2} className="py-3 px-3 text-right text-slate-700 dark:text-slate-300 uppercase tracking-wider font-extrabold text-[11px]">
                  Total {type === 'PURCHASE' ? 'Pembelian' : 'Penjualan'}:
                </td>
                <td className="py-3 px-4 text-right text-sm sm:text-base font-extrabold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                  Rp {grandTotal.toLocaleString('id-ID')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
