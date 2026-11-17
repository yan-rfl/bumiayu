'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X, Store, Check, AlertTriangle, UserPlus } from 'lucide-react';

export interface StoreOption {
  id: string;
  name: string;
  code?: string;
  zone_code?: string;
  address?: string;
  top_days?: number;
  credit_limit?: number;
  current_debt?: number;
  is_locked?: boolean;
}

interface SearchableStoreSelectProps {
  stores: StoreOption[];
  value: string; // store_id
  onChange: (storeId: string, storeObj?: StoreOption | null) => void;
  onAddNewStore?: () => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  showCreditDetails?: boolean;
  className?: string;
}

export default function SearchableStoreSelect({
  stores,
  value,
  onChange,
  onAddNewStore,
  placeholder = 'Ketik nama toko, kode, atau zona...',
  label,
  required = false,
  showCreditDetails = false,
  className = '',
}: SearchableStoreSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cari toko terpilih berdasarkan id
  const selectedStore = useMemo(() => {
    return stores.find((s) => s.id === value) || null;
  }, [stores, value]);

  // Filter daftar toko berdasarkan nama, kode, atau zona
  const filteredStores = useMemo(() => {
    if (!searchQuery.trim()) return stores;
    const q = searchQuery.toLowerCase().trim();
    return stores.filter((s) => {
      const nameMatch = (s.name || '').toLowerCase().includes(q);
      const codeMatch = (s.code || '').toLowerCase().includes(q);
      const zoneMatch = (s.zone_code || '').toLowerCase().includes(q);
      const addrMatch = (s.address || '').toLowerCase().includes(q);
      return nameMatch || codeMatch || zoneMatch || addrMatch;
    });
  }, [stores, searchQuery]);

  // Click outside listener untuk menutup dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    setSearchQuery('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleSelect = (store: StoreOption) => {
    onChange(store.id, store);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', null);
    setSearchQuery('');
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Button / Trigger Tampilan */}
      <div
        onClick={handleOpen}
        className={`w-full px-3 py-2 text-xs font-bold rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
          isOpen
            ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-white dark:bg-slate-900 shadow-sm'
            : selectedStore
            ? 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:border-slate-400'
            : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-400 hover:border-slate-400'
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {selectedStore ? (
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-extrabold text-slate-900 dark:text-slate-100 truncate">
                {selectedStore.name}
              </span>
              {(selectedStore.code || selectedStore.zone_code) && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                  {selectedStore.code || selectedStore.zone_code}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 font-medium truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedStore && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Hapus pilihan"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown Menu Mengambang */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Input Pencarian */}
          <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 space-y-2">
            {onAddNewStore && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onAddNewStore();
                }}
                className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-dashed border-emerald-300 dark:border-emerald-800"
              >
                <UserPlus className="w-3.5 h-3.5" />
                + Daftarkan Toko Baru
              </button>
            )}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik nama toko, kode, atau wilayah..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>

          {/* List Toko */}
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
            {filteredStores.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 italic">
                Tidak ada toko yang cocok dengan "{searchQuery}"
              </div>
            ) : (
              filteredStores.map((store) => {
                const isSelected = store.id === value;
                return (
                  <div
                    key={store.id}
                    onClick={() => handleSelect(store)}
                    className={`p-2.5 rounded-xl cursor-pointer transition-colors flex items-start justify-between gap-2 text-xs ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-bold'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold truncate">{store.name}</span>
                        {(store.code || store.zone_code) && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                            {store.code || store.zone_code}
                          </span>
                        )}
                        {store.is_locked && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 flex items-center gap-0.5 shrink-0">
                            <AlertTriangle className="w-2.5 h-2.5" /> Terkunci
                          </span>
                        )}
                      </div>

                      {store.address && (
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {store.address}
                        </div>
                      )}

                      {showCreditDetails && (
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          <span>TOP: {store.top_days ? `${store.top_days} Hari` : 'Tunai'}</span>
                          {Number(store.current_debt || 0) > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-amber-600 dark:text-amber-400 font-bold">
                                Hutang: Rp {Number(store.current_debt).toLocaleString('id-ID')}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
