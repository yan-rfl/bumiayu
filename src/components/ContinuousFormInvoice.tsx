'use client';

import React from 'react';

interface ContinuousFormInvoiceProps {
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
      <div className="flex items-start justify-between border-b pb-2 mb-2">
        <div>
          <h2 className="text-sm font-bold tracking-wider">BUMIAYU DISTRIBUTOR</h2>
          <p className="text-[10px]">Distribusi Produk Konsumsi & Charm - Bumiayu, Brebes</p>
          <p className="text-[10px] font-bold mt-1 text-emerald-700">{plyLabels[plyType]}</p>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold">{invoiceNo}</div>
          <div className="text-[10px]">No SO: {orderNo}</div>
          <div className="text-[10px]">Tgl: {orderDate} | JT: {dueDate}</div>
        </div>
      </div>

      {/* Info Toko */}
      <div className="flex justify-between text-[10px] mb-2">
        <div>
          <span className="font-bold">Kepada Yth:</span> {storeName}
          <div>{storeAddress}</div>
        </div>
        <div className="text-right">
          <span>Format: Continuous 9.5 x 5.5 inch (Epson LX-310)</span>
        </div>
      </div>

      {/* Tabel Item */}
      <table className="w-full text-left border-collapse border-t border-b mb-2">
        <thead>
          <tr className="border-b font-bold">
            <th className="py-1">Nama Barang / SKU</th>
            <th className="py-1 text-center">Satuan</th>
            <th className="py-1 text-center">Qty</th>
            <th className="py-1 text-right">Harga (Rp)</th>
            <th className="py-1 text-right">Subtotal (Rp)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => (
            <tr key={idx} className="border-b border-dashed border-slate-200">
              <td className="py-1">{it.name}</td>
              <td className="py-1 text-center">{it.unit_name}</td>
              <td className="py-1 text-center font-bold">{it.quantity}</td>
              <td className="py-1 text-right">{it.unit_price.toLocaleString('id-ID')}</td>
              <td className="py-1 text-right font-bold">{it.total_price.toLocaleString('id-ID')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer Nota & Tanda Tangan */}
      <div className="flex items-end justify-between pt-1">
        <div className="grid grid-cols-3 gap-6 text-center text-[10px]">
          <div>
            <p>Penerima / Toko</p>
            <div className="h-10"></div>
            <p className="border-t border-dotted pt-0.5">(..................)</p>
          </div>
          <div>
            <p>Supir Pengantar</p>
            <div className="h-10"></div>
            <p className="border-t border-dotted pt-0.5">(..................)</p>
          </div>
          <div>
            <p>Admin / Gudang</p>
            <div className="h-10"></div>
            <p className="border-t border-dotted pt-0.5">(..................)</p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs font-bold">TOTAL FAKTUR:</div>
          <div className="text-sm font-extrabold">Rp {grandTotal.toLocaleString('id-ID')}</div>
        </div>
      </div>
    </div>
  );
}
