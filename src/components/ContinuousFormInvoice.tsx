'use client';

import React, { useState, useEffect } from 'react';

export function angkaTerbilang(num: number): string {
  const bilangan = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  const n = Math.floor(Math.abs(num));
  if (n === 0) return 'nol rupiah';

  function sebut(val: number): string {
    if (val < 12) return bilangan[val];
    if (val < 20) return sebut(val - 10) + ' belas';
    if (val < 100) return sebut(Math.floor(val / 10)) + ' puluh' + (val % 10 > 0 ? ' ' + sebut(val % 10) : '');
    if (val < 200) return 'seratus' + (val - 100 > 0 ? ' ' + sebut(val - 100) : '');
    if (val < 1000) return sebut(Math.floor(val / 100)) + ' ratus' + (val % 100 > 0 ? ' ' + sebut(val % 100) : '');
    if (val < 2000) return 'seribu' + (val - 1000 > 0 ? ' ' + sebut(val - 1000) : '');
    if (val < 1000000) return sebut(Math.floor(val / 1000)) + ' ribu' + (val % 1000 > 0 ? ' ' + sebut(val % 1000) : '');
    if (val < 1000000000) return sebut(Math.floor(val / 1000000)) + ' juta' + (val % 1000000 > 0 ? ' ' + sebut(val % 1000000) : '');
    if (val < 1000000000000) return sebut(Math.floor(val / 1000000000)) + ' miliar' + (val % 1000000000 > 0 ? ' ' + sebut(val % 1000000000) : '');
    return String(val);
  }

  return (sebut(n) + ' rupiah').trim();
}

export interface InvoiceItem {
  name: string;
  unit_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  sku?: string;
  discount_percent?: number;
}

export interface InvoiceTemplateOptions {
  documentTitle?: string;
  subHeaderCode?: string;
  departmentCode?: string;
  paperSize?: string;
  showItemSku?: boolean;
  showDiscountCol?: boolean;
  showItemNo?: boolean;
  termsNotes?: string;
  signerLeft?: string;
  signerRight?: string;
  itemsPerPage?: number;
  fontSize?: '9px' | '10px' | '11px' | '12px';
}

export interface ContinuousFormInvoiceProps {
  invoiceNo?: string;
  orderNo?: string;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  salesName?: string;
  orderDate?: string;
  dueDate?: string;
  items: InvoiceItem[];
  grandTotal: number;
  notes?: string;
  plyType?: 'PUTIH' | 'PINK' | 'KUNING';
  customTemplate?: InvoiceTemplateOptions;
}

export default function ContinuousFormInvoice({
  invoiceNo = 'INV-DRAFT',
  orderNo = 'SO-DRAFT',
  storeName = 'TOKO BAROKAH',
  storeAddress = 'Bumiayu, Brebes',
  salesName = 'Admin',
  orderDate = '17/11/2026',
  dueDate = 'Tunai',
  items = [],
  grandTotal = 0,
  notes = '',
  plyType = 'PUTIH',
  customTemplate,
}: ContinuousFormInvoiceProps) {
  const [savedTemplate, setSavedTemplate] = useState<InvoiceTemplateOptions>({
    documentTitle: 'FAKTUR PENJUALAN',
    subHeaderCode: '168',
    departmentCode: 'UTM',
    showItemSku: true,
    showDiscountCol: true,
    showItemNo: true,
    termsNotes: '',
    signerLeft: 'Hormat Kami',
    signerRight: 'Penerima',
    itemsPerPage: 11, // Default 11 item agar muat 1 faktur
    fontSize: '10px',
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('bumiayu_invoice_template');
      if (saved) {
        setSavedTemplate((prev) => ({ ...prev, ...JSON.parse(saved) }));
      }
    } catch (e) {
      console.error('Failed to parse invoice template', e);
    }
  }, []);

  // Gabungkan template tersimpan dengan live customTemplate jika ada
  const template = { ...savedTemplate, ...(customTemplate || {}) };

  // Pecah daftar barang menjadi halaman (Paging untuk Continuous Form)
  const itemsPerPage = Math.max(4, template.itemsPerPage || 11);
  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
  const pages: InvoiceItem[][] = [];
  for (let i = 0; i < totalPages; i++) {
    pages.push(items.slice(i * itemsPerPage, (i + 1) * itemsPerPage));
  }

  const totalItemQty = items.reduce((sum, it) => sum + Number(it.quantity || 0), 0);
  const isCredit = dueDate !== 'Tunai' && !dueDate.toLowerCase().includes('tunai');

  // Format currency helper
  const fmt = (val: number) => Number(val || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const activeFontSize = template.fontSize || '10px';

  return (
    <div className="space-y-6 print:space-y-0 font-mono">
      {pages.map((pageItems, pageIdx) => {
        const isFirstPage = pageIdx === 0;
        const isLastPage = pageIdx === totalPages - 1;
        const pageStartIdx = pageIdx * itemsPerPage;

        return (
          <div
            key={pageIdx}
            className="w-full max-w-4xl mx-auto p-4 sm:p-6 bg-[#fafaf7] text-slate-900 border border-slate-300 shadow-xs print:shadow-none print:border-none print:p-0 print:m-0 leading-tight"
            style={{
              fontFamily: 'Courier New, Courier, monospace',
              fontSize: activeFontSize,
              pageBreakAfter: isLastPage ? 'auto' : 'always',
            }}
          >
            {/* ================================================================= */}
            {/* HEADER FAKTUR                                                     */}
            {/* ================================================================= */}
            {isFirstPage ? (
              // Halaman Pertama: Header Faktur Lengkap (Sesuai Foto 1)
              <div className="grid grid-cols-12 gap-2 pb-1.5 mb-1.5 border-b border-black">
                {/* Kolom Kiri: Judul Dokumen & Sub-code */}
                <div className="col-span-4 flex flex-col justify-between">
                  <div>
                    <h1 className="font-black tracking-wider uppercase text-black" style={{ fontSize: '130%' }}>
                      {template.documentTitle || 'FAKTUR PENJUALAN'}
                    </h1>
                    {template.subHeaderCode?.trim() && (
                      <div className="font-bold text-slate-700 tracking-wide mt-0.5">
                        {template.subHeaderCode}
                      </div>
                    )}
                  </div>
                </div>

                {/* Kolom Tengah: Info Transaksi & Toko */}
                <div className="col-span-5 space-y-0.5">
                  <div className="flex">
                    <span className="w-24 font-semibold text-slate-700">No Transaksi</span>
                    <span>: <strong className="font-bold">{invoiceNo}</strong></span>
                  </div>
                  <div className="flex">
                    <span className="w-24 font-semibold text-slate-700">Tanggal</span>
                    <span>: {orderDate}</span>
                  </div>
                  <div className="flex">
                    <span className="w-24 font-semibold text-slate-700">Kode Sales</span>
                    <span>: {salesName}</span>
                  </div>
                  <div className="flex">
                    <span className="w-24 font-semibold text-slate-700">Pelanggan</span>
                    <span>: <strong className="font-bold uppercase">{storeName}</strong></span>
                  </div>
                  <div className="flex">
                    <span className="w-24 font-semibold text-slate-700">Alamat</span>
                    <span className="truncate">: {storeAddress}</span>
                  </div>
                </div>

                {/* Kolom Kanan: Dept, User & PPN */}
                <div className="col-span-3 text-right space-y-0.5">
                  <div>Dept. : <strong>{template.departmentCode || 'UTM'}</strong></div>
                  <div>User  : <strong>ADMIN</strong></div>
                  <div>PPN   : <strong>Non</strong></div>
                  {totalPages > 1 && (
                    <div className="font-bold text-slate-600 mt-1" style={{ fontSize: '90%' }}>
                      Hal: {pageIdx + 1} / {totalPages}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Halaman Lanjutan (Foto 2): Header Minimal 1-Baris Saja
              <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-dashed border-black">
                <div className="flex items-center gap-2">
                  <span className="font-black uppercase">
                    [{template.documentTitle || 'FAKTUR PENJUALAN'} - Lanjutan Hal {pageIdx + 1}]
                  </span>
                  <span className="text-slate-600">No: <strong>{invoiceNo}</strong></span>
                </div>
                <div className="text-right">
                  <span>Pelanggan: <strong className="uppercase">{storeName}</strong></span>
                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* TABEL RINCIAN PRODUK (Padat & Efisien, Muat 11+ Item)              */}
            {/* ================================================================= */}
            <table className="w-full text-left border-collapse mb-1.5">
              <thead>
                <tr className="border-t border-b border-black font-bold uppercase">
                  {template.showItemNo && <th className="py-0.5 w-7 text-center">No.</th>}
                  {template.showItemSku && <th className="py-0.5 w-24">Kode Item</th>}
                  <th className="py-0.5">Nama Item</th>
                  <th className="py-0.5 text-right w-24">Jml Satuan</th>
                  <th className="py-0.5 text-right w-24">Harga</th>
                  {template.showDiscountCol && <th className="py-0.5 text-right w-16">Pot</th>}
                  <th className="py-0.5 text-right w-28">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dotted divide-slate-300">
                {pageItems.map((it, itemIdx) => {
                  const globalIdx = pageStartIdx + itemIdx + 1;
                  const rawSubtotal = Number(it.quantity || 0) * Number(it.unit_price || 0);
                  const discountPct =
                    it.discount_percent !== undefined
                      ? it.discount_percent
                      : rawSubtotal > it.total_price && rawSubtotal > 0
                      ? Math.round(((rawSubtotal - it.total_price) / rawSubtotal) * 100)
                      : 0;

                  return (
                    <tr key={itemIdx} className="hover:bg-slate-100/50">
                      {template.showItemNo && (
                        <td className="py-0.5 text-center align-top">{globalIdx}</td>
                      )}
                      {template.showItemSku && (
                        <td className="py-0.5 align-top font-mono font-semibold uppercase">
                          {it.sku || '-'}
                        </td>
                      )}
                      <td className="py-0.5 align-top">
                        <span className="font-bold">{it.name}</span>
                      </td>
                      <td className="py-0.5 text-right align-top whitespace-nowrap">
                        {Number(it.quantity || 0).toLocaleString('id-ID', { minimumFractionDigits: 2 })}{' '}
                        <span className="font-semibold">{it.unit_name}</span>
                      </td>
                      <td className="py-0.5 text-right align-top whitespace-nowrap">
                        {fmt(it.unit_price)}
                      </td>
                      {template.showDiscountCol && (
                        <td className="py-0.5 text-right align-top whitespace-nowrap">
                          {discountPct > 0 ? `${discountPct}%` : '0,00'}
                        </td>
                      )}
                      <td className="py-0.5 text-right align-top font-bold whitespace-nowrap">
                        {fmt(it.total_price)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Indikator Bersambung jika belum halaman terakhir */}
            {!isLastPage && (
              <div className="py-1 text-right border-t border-b border-black text-[9px] italic text-slate-600">
                (Bersambung ke Halaman {pageIdx + 2}...)
              </div>
            )}

            {/* ================================================================= */}
            {/* FOOTER FAKTUR (Hanya di Halaman Terakhir, Sesuai Foto 1 & Foto 2)  */}
            {/* ================================================================= */}
            {isLastPage && (
              <div className="pt-1.5 border-t border-black space-y-1.5" style={{ fontSize: '95%' }}>
                <div className="grid grid-cols-12 gap-2">
                  {/* Kolom 1 (Kiri): Keterangan, Tanda Tangan & Terbilang */}
                  <div className="col-span-5 flex flex-col justify-between">
                    <div>
                      {/* Catatan / Keterangan: Hanya render jika tidak kosong (Sesuai Foto 4) */}
                      {notes && notes.trim().length > 0 && (
                        <div className="mb-1">
                          <span className="font-bold">Keterangan : </span>
                          <span>{notes.trim()}</span>
                        </div>
                      )}

                      {/* Syarat & Ketentuan dari template: Hanya render jika tidak kosong (Sesuai Foto 4) */}
                      {template.termsNotes && template.termsNotes.trim().length > 0 && (
                        <div className="mb-1 text-slate-700 whitespace-pre-line leading-relaxed" style={{ fontSize: '90%' }}>
                          <span className="font-bold">Syarat &amp; Ketentuan:</span>
                          <br />
                          {template.termsNotes.trim()}
                        </div>
                      )}
                    </div>

                    {/* Tanda Tangan: Cukup 2 Kolom (Hormat Kami & Penerima) Sesuai Foto 1 & 2 */}
                    <div className="grid grid-cols-2 gap-4 text-center pt-1">
                      <div>
                        <p className="font-bold">{template.signerLeft || 'Hormat Kami'}</p>
                        <div className="h-8 sm:h-9"></div>
                        <p className="border-t border-dotted border-black pt-0.5">(....................)</p>
                      </div>
                      <div>
                        <p className="font-bold">{template.signerRight || 'Penerima'}</p>
                        <div className="h-8 sm:h-9"></div>
                        <p className="border-t border-dotted border-black pt-0.5">(....................)</p>
                      </div>
                    </div>

                    {/* Terbilang Huruf Rupiah */}
                    <div className="pt-1 italic text-slate-800" style={{ fontSize: '90%' }}>
                      <strong>Terbilang : </strong>
                      <span className="capitalize">{angkaTerbilang(grandTotal)}</span>
                    </div>
                  </div>

                  {/* Kolom 2 (Tengah): Detail Potongan & Pajak */}
                  <div className="col-span-3 space-y-0.5 text-right pr-2 border-r border-dashed border-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Jml Item :</span>
                      <strong>{Number(totalItemQty).toLocaleString('id-ID', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Potongan :</span>
                      <span>0,00 % &nbsp; 0,00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Pajak :</span>
                      <span>0,00 % &nbsp; 0,00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Biaya Lain :</span>
                      <span>0,00</span>
                    </div>
                    <div className="flex justify-between pt-0.5 border-t border-dashed border-slate-300">
                      <span className="text-slate-600">Tanggal Jt :</span>
                      <strong>{dueDate}</strong>
                    </div>
                  </div>

                  {/* Kolom 3 (Kanan): Ringkasan Finansial & Total Akhir */}
                  <div className="col-span-4 space-y-0.5 text-right">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Sub Total :</span>
                      <span>{fmt(grandTotal)}</span>
                    </div>
                    <div className="flex justify-between font-black" style={{ fontSize: '110%' }}>
                      <span>Total Akhir :</span>
                      <span>{fmt(grandTotal)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>DP PO :</span>
                      <span>0,00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Tunai :</span>
                      <span>{isCredit ? '0,00' : fmt(grandTotal)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-600">Kredit :</span>
                      <span>{isCredit ? fmt(grandTotal) : '0,00'}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>K. Debit :</span>
                      <span>0,00</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>K. Kredit :</span>
                      <span>0,00</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Kembali :</span>
                      <span>0,00</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
