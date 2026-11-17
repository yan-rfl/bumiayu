'use client';

import React, { useState, useEffect } from 'react';

export interface ContinuousFormInvoiceProps {
  invoiceNo?: string;
  orderNo?: string;
  storeName: string;
  storeAddress: string;
  storePhone?: string;
  orderDate: string;
  dueDate: string;
  items: Array<{
    name: string;
    unit_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    sku?: string;
    discount_percent?: number;
  }>;
  grandTotal: number;
  plyType: 'PUTIH' | 'PINK' | 'KUNING'; // Putih: Toko, Pink: Bukti Kirim Supir, Kuning: Kantor
}

export default function ContinuousFormInvoice({
  invoiceNo = 'INV-DRAFT',
  orderNo = 'SO-DRAFT',
  storeName,
  storeAddress,
  orderDate,
  dueDate,
  items,
  grandTotal,
  plyType,
}: ContinuousFormInvoiceProps) {
  const [template, setTemplate] = useState({
    companyName: 'BUMIAYU DISTRIBUTOR',
    companyTagline: 'Distribusi & Grosir Produk Konsumsi',
    companyAddress: 'Jl. Raya Diponegoro No. 88, Bumiayu, Brebes, Jawa Tengah',
    companyPhone: 'WA / Telp: 0812-3456-7890',
    documentTitle: 'FAKTUR PENJUALAN',
    paperSize: 'continuous_half_letter',
    showItemSku: true,
    showDiscountCol: true,
    showItemNo: true,
    termsNotes: '1. Barang yang telah dibeli tidak dapat ditukar/dikembalikan tanpa persetujuan kantor.\n2. Pembayaran bilyet giro/cek baru sah jika dana sudah masuk ke rekening kami.',
    signerLeft: 'Penerima / Toko',
    signerMiddle: 'Supir / Pengirim',
    signerRight: 'Admin / Gudang',
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('bumiayu_invoice_template');
      if (saved) {
        setTemplate((prev) => ({ ...prev, ...JSON.parse(saved) }));
      }
    } catch (e) {
      console.error('Failed to parse invoice template', e);
    }
  }, []);

  const plyLabels = {
    PUTIH: 'LEMBAR 1: ASLI (UNTUK TOKO / PEMBELI)',
    PINK: 'LEMBAR 2: MERAH MUDA (TANDA TERIMA SUPIR / EKSPEDISI)',
    KUNING: 'LEMBAR 3: KUNING (ARSIP KANTOR / ADMIN BUMIAYU)',
  };

  const plyColors = {
    PUTIH: 'border-slate-300 bg-white text-slate-900',
    PINK: 'border-pink-300 bg-pink-50/70 text-pink-950',
    KUNING: 'border-amber-300 bg-amber-50/70 text-amber-950',
  };

  return (
    <div
      className={`w-full max-w-3xl mx-auto p-4 border rounded-lg font-mono text-[11px] leading-tight ${plyColors[plyType]}`}
      style={{ fontFamily: 'Courier New, Courier, monospace' }}
    >
      {/* Header Nota */}
      <div className="flex items-start justify-between border-b border-dashed border-slate-400 pb-2 mb-2">
        <div>
          <h2 className="text-sm font-bold tracking-wider uppercase">{template.companyName}</h2>
          <p className="text-[10px]">{template.companyTagline}</p>
          <p className="text-[9px] text-slate-600">{template.companyAddress} | {template.companyPhone}</p>
          <p className="text-[10px] font-bold mt-1 text-emerald-700">{plyLabels[plyType]}</p>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold uppercase tracking-wider">{template.documentTitle}</div>
          <div className="text-xs font-bold">{invoiceNo}</div>
          <div className="text-[10px]">No SO: {orderNo}</div>
          <div className="text-[10px]">Tgl: {orderDate} | JT: {dueDate}</div>
        </div>
      </div>

      {/* Info Toko */}
      <div className="flex justify-between text-[10px] mb-2 border-b border-dashed border-slate-300 pb-1.5">
        <div>
          <span className="font-bold">Kepada Yth:</span> {storeName}
          <div>{storeAddress}</div>
        </div>
        <div className="text-right">
          <span>Format: Continuous 9.5 x 5.5 inch (Epson LX-310)</span>
        </div>
      </div>

      {/* Tabel Item */}
      <table className="w-full text-left border-collapse border-t border-b border-black mb-2">
        <thead>
          <tr className="border-b border-black font-bold uppercase">
            {template.showItemNo && <th className="py-1 w-6">No</th>}
            <th className="py-1">Nama Barang {template.showItemSku && '/ SKU'}</th>
            <th className="py-1 text-center">Satuan</th>
            <th className="py-1 text-center">Qty</th>
            <th className="py-1 text-right">Harga (Rp)</th>
            {template.showDiscountCol && <th className="py-1 text-right">Disc %</th>}
            <th className="py-1 text-right">Subtotal (Rp)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => {
            const rawSubtotal = it.quantity * it.unit_price;
            const discountPct =
              it.discount_percent !== undefined
                ? it.discount_percent
                : rawSubtotal > it.total_price && rawSubtotal > 0
                ? Math.round(((rawSubtotal - it.total_price) / rawSubtotal) * 100)
                : 0;

            return (
              <tr key={idx} className="border-b border-dashed border-slate-300">
                {template.showItemNo && <td className="py-1">{idx + 1}</td>}
                <td className="py-1">
                  <span className="font-semibold">{it.name}</span>
                  {template.showItemSku && it.sku && (
                    <span className="text-[9px] block text-slate-500 font-mono">{it.sku}</span>
                  )}
                </td>
                <td className="py-1 text-center">{it.unit_name}</td>
                <td className="py-1 text-center font-bold">{it.quantity}</td>
                <td className="py-1 text-right">{it.unit_price.toLocaleString('id-ID')}</td>
                {template.showDiscountCol && (
                  <td className="py-1 text-right">
                    {discountPct > 0 ? `${discountPct}%` : '-'}
                  </td>
                )}
                <td className="py-1 text-right font-bold">{it.total_price.toLocaleString('id-ID')}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Syarat Ketentuan & Grand Total */}
      <div className="flex items-start justify-between gap-4 pt-1 mb-2">
        <div className="max-w-[60%] text-[9px] text-slate-600 whitespace-pre-line leading-relaxed">
          {template.termsNotes}
        </div>
        <div className="text-right min-w-[35%]">
          <div className="text-xs font-bold">TOTAL FAKTUR:</div>
          <div className="text-sm font-extrabold">Rp {grandTotal.toLocaleString('id-ID')}</div>
        </div>
      </div>

      {/* Footer Nota & Tanda Tangan */}
      <div className="pt-2 border-t border-dashed border-slate-400">
        <div className="grid grid-cols-3 gap-6 text-center text-[10px]">
          <div>
            <p className="font-bold">{template.signerLeft}</p>
            <div className="h-10"></div>
            <p className="border-t border-dotted border-black pt-0.5">(..................)</p>
          </div>
          <div>
            <p className="font-bold">{template.signerMiddle}</p>
            <div className="h-10"></div>
            <p className="border-t border-dotted border-black pt-0.5">(..................)</p>
          </div>
          <div>
            <p className="font-bold">{template.signerRight}</p>
            <div className="h-10"></div>
            <p className="border-t border-dotted border-black pt-0.5">(..................)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
