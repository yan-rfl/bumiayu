import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

wb = openpyxl.Workbook()
# Remove default sheet
wb.remove(wb.active)

# Color Palette (Modern Corporate Slate & Emerald)
HEADER_FILL = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid") # Dark Slate
HEADER_FONT = Font(name="Arial", size=11, bold=True, color="FFFFFF")

SECTION_FILL = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid") # Light Slate
SECTION_FONT = Font(name="Arial", size=10, bold=True, color="0F172A")

IPOS_HEADER_FILL = PatternFill(start_color="334155", end_color="334155", fill_type="solid")
BUMIAYU_HEADER_FILL = PatternFill(start_color="065F46", end_color="065F46", fill_type="solid") # Deep Emerald

ROW_ALT_FILL = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
WHITE_FILL = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")

BORDER_THIN = Border(
    left=Side(style='thin', color="CBD5E1"),
    right=Side(style='thin', color="CBD5E1"),
    top=Side(style='thin', color="CBD5E1"),
    bottom=Side(style='thin', color="CBD5E1")
)

ALIGN_LEFT = Alignment(horizontal='left', vertical='top', wrap_text=True)
ALIGN_CENTER = Alignment(horizontal='center', vertical='top', wrap_text=True)
ALIGN_CENTER_MIDDLE = Alignment(horizontal='center', vertical='center', wrap_text=True)

# -------------------------------------------------------------------------
# SHEET 1: Perbandingan Fitur iPos 5 vs BumiAyu PWA
# -------------------------------------------------------------------------
ws1 = wb.create_sheet(title="Perbandingan Fitur")
ws1.views.sheetView[0].showGridLines = True

# Title block
ws1.merge_cells("A1:G1")
ws1["A1"] = "MATRIKS PERBANDINGAN FITUR: IPOS 5 VS BUMIAYU NEXT.JS PWA"
ws1["A1"].font = Font(name="Arial", size=14, bold=True, color="0F172A")
ws1["A1"].alignment = Alignment(horizontal="left", vertical="center")
ws1.row_dimensions[1].height = 30

ws1.merge_cells("A2:G2")
ws1["A2"] = "Distributor Charm & Produk Konsumsi BumiAyu | Role: Sales (Mobile PWA) & Owner (Web Desktop)"
ws1["A2"].font = Font(name="Arial", size=10, italic=True, color="475569")
ws1["A2"].alignment = Alignment(horizontal="left", vertical="center")
ws1.row_dimensions[2].height = 20

headers_ws1 = [
    ("No", 6, ALIGN_CENTER_MIDDLE),
    ("Modul / Kategori", 18, ALIGN_LEFT),
    ("Fitur di iPos 5 (Desktop)", 26, ALIGN_LEFT),
    ("Konsep & Mekanisme Kerja di iPos 5", 34, ALIGN_LEFT),
    ("Fitur yang Diterapkan di BumiAyu (Next.js PWA)", 28, ALIGN_LEFT),
    ("Konsep & Mekanisme Kerja di BumiAyu (Sales & Owner)", 36, ALIGN_LEFT),
    ("Prioritas Rilis", 14, ALIGN_CENTER_MIDDLE)
]

# Set headers row 4
ws1.row_dimensions[4].height = 32
for col_idx, (col_name, col_width, align) in enumerate(headers_ws1, start=1):
    cell = ws1.cell(row=4, column=col_idx, value=col_name)
    cell.font = HEADER_FONT
    cell.alignment = align
    cell.border = BORDER_THIN
    if "iPos" in col_name:
        cell.fill = IPOS_HEADER_FILL
    elif "BumiAyu" in col_name:
        cell.fill = BUMIAYU_HEADER_FILL
    else:
        cell.fill = HEADER_FILL
    ws1.column_dimensions[get_column_letter(col_idx)].width = col_width

data_fitur = [
    # 1. Master Data
    (
        "Master Data",
        "Master Barang & Multi-Satuan",
        "Pencatatan item barang dengan multi satuan bertingkat (Dus > Slop > Lusin > Pcs), konversi satuan manual, level harga jual 1-5 berdasarkan kategori pelanggan/jumlah pembelian.",
        "Sistem menyimpan rasio konversi unit (misal 1 Dus = 24 Renceng = 288 Pcs). Menghitung HPP dengan metode FIFO/Average. Pengguna harus input manual di komputer kasir.",
        "Master Produk Cloud & Multi-Level Satuan Dinamis (Mobile Ready)",
        "Database cloud terpusat. Sales di HP memilih satuan dengan cepat (cth: ketik 2 Dus + 5 Renceng). Sistem otomatis konversi ke satuan dasar stok gudang. Owner bisa atur harga tiering distributor & minimal order per toko.",
        "Fase 1 (MVP)"
    ),
    (
        "Master Data",
        "Master Pelanggan & Plafon Piutang",
        "Data profil toko/pelanggan, plafon kredit (nominal maksimal piutang), dan termin jatuh tempo (TOP - Term of Payment 7/14/30 hari).",
        "Ketika sales/kasir membuat nota di iPos melebihi batas plafon, sistem memunculkan peringatan dialog di Windows untuk meminta otorisasi password admin/owner.",
        "Master Toko + Geotagging + Limit Kredit Realtime",
        "Profil toko dilengkapi koordinat GPS lokasi toko, kontak WhatsApp owner toko, termin TOP, dan status limit piutang. Jika piutang toko jatuh tempo, aplikasi Sales langsung mengunci input order baru kecuali ada izin/token dari Owner.",
        "Fase 1 (MVP)"
    ),
    (
        "Master Data",
        "Master Rute & Zonasi Kunjungan (Sales Beat)",
        "Tidak ada modul rute kunjungan sales bawaan. Pelanggan hanya bisa dikelompokkan berdasarkan Kode Grup/Wilayah statis.",
        "Hanya berupa label teks kelompok wilayah pelanggan di laporan penjualan, tidak mengatur jadwal hari kunjungan sales di lapangan.",
        "Penjadwalan Rute Sales Harian (Beat Route Management)",
        "Pengelompokan toko berdasarkan hari kunjungan (Senin: Rute Pasar A, Selasa: Rute Ritel B). Sales membuka HP dan langsung disajikan daftar toko yang wajib dikunjungi hari itu beserta rutenya.",
        "Fase 2"
    ),

    # 2. Penjualan & Order Sales
    (
        "Penjualan & Order",
        "Sales Order (Pesanan Penjualan)",
        "Input pesanan pelanggan melalui PC kantor/desktop kasir. Sering kali sales luar menitipkan catatan pesanan manual di kertas ke admin kantor.",
        "Dokumen SO dibuat di PC, belum memotong stok fisik gudang (hanya status booked). Harus diproses manual menjadi Faktur Penjualan satu demi satu oleh admin.",
        "Mobile Sales Order PWA (Offline-First)",
        "Sales langsung input pesanan di HP di depan pemilik toko. Interface mirip keranjang belanja e-commerce yang cepat. Tetap berfungsi offline jika toko di area tanpa sinyal, auto-sync saat dapat internet. SO langsung tampil di layar Owner.",
        "Fase 1 (MVP)"
    ),
    (
        "Penjualan & Order",
        "Faktur Penjualan (Sales Invoice)",
        "Pembuatan nota faktur penjualan di PC kasir/admin. Mengurangi stok barang di gudang dan otomatis membuat saldo piutang jika pembayaran non-tunai (kredit).",
        "Sistem memotong kuantitas stok real-time di database lokal dan mendebit akun Piutang Usaha serta mengkredit akun Penjualan Barang.",
        "Faktur Penjualan & Konfirmasi Pengiriman Cloud",
        "Owner mereview SO dari sales, lalu melakukan 1-klik konversi SO menjadi Faktur Penjualan. Stok gudang otomatis terpotong saat faktur disetujui, dan saldo piutang toko bertambah sesuai jatuh tempo.",
        "Fase 1 (MVP)"
    ),
    (
        "Penjualan & Order",
        "Surat Jalan / Bukti Kirim",
        "Cetak dokumen surat jalan pengiriman dari Faktur atau DO di PC desktop untuk dibawa supir.",
        "Hanya mencetak kertas surat jalan sebagai tanda terima tanda tangan supir dan toko penerima, lalu admin input ulang status terkirim.",
        "Surat Jalan Terintegrasi + Rekap Muatan Ekspedisi",
        "Dokumen Surat Jalan dibuat bersamaan dengan faktur. Supir/sales bisa menunjukkan versi digital di HP atau membawa cetakan fisik continuous form. Dilengkapi status pengiriman (Dipacking, Dikirim, Selesai).",
        "Fase 1 (MVP)"
    ),

    # 3. Rekap & Pencetakan Continuous Form
    (
        "Cetak & Rekapitulasi",
        "Cetak Continuous Form (Dot Matrix)",
        "Mencetak faktur/nota ke kertas continuous form (kertas rangkap berlubang) menggunakan FastReport / driver printer Windows bawaan (Epson LX-300 / LX-310).",
        "Bergantung pada driver printer lokal Windows (PC kasir). Format teks atau graphic driver yang sering macet spasi/margin saat ganti komputer.",
        "Web Printing Continuous Form (Raw ESC/P & Print Engine)",
        "Owner mencetak faktur continuous form langsung dari browser Next.js PWA. Menggunakan format khusus dot matrix (ESC/P commands via bridge lokal / Web Serial / Web Print CSS paginated) agar cetakan presisi, super cepat, tanpa delay spooler.",
        "Fase 1 (MVP)"
    ),
    (
        "Cetak & Rekapitulasi",
        "Rekapitulasi Order Harian (Muatan Kirim)",
        "Laporan pesanan penjualan di iPos bisa difilter per tanggal, namun formatnya per nota dan harus diexport manual ke Excel untuk menghitung total dus yang harus dimuat ke armada.",
        "Admin mencetak puluhan lembar SO atau export Excel, lalu menjumlahkan manual berapa total Dus Charm Biru, Charm Malam, dll yang harus diambil dari gudang.",
        "Rekap Muatan Otomatis (Consolidated Loading / Picking Sheet)",
        "Owner memiliki satu tombol dashboard 'Rekap Muatan Hari Ini'. Sistem secara otomatis menjumlahkan akumulasi total barang dari seluruh toko (cth: Total 45 Dus Charm A, 30 Dus Charm B) untuk langsung diserahkan ke bagian gudang/packing.",
        "Fase 1 (MVP)"
    ),

    # 4. Keuangan, Piutang & Pengeluaran
    (
        "Keuangan & Kas",
        "Pembayaran Piutang Toko",
        "Admin kantor membuka menu Pembayaran Piutang di PC, memilih nomor faktur yang dibayar toko, dan memasukkan nominal transfer/tunai.",
        "Sistem mengurangi saldo Piutang Usaha toko tersebut dan menambah saldo Kas Toko / Rekening Bank. Mencatat mutasi kas masuk.",
        "Penagihan Piutang Lapangan oleh Sales (Mobile Collection)",
        "Sales saat berkunjung ke toko dapat melihat daftar faktur yang belum lunas. Sales bisa menerima titipan uang tunai/transfer, mengupload foto bukti transfer/titipan, dan Owner langsung memvalidasi dari dashboard web.",
        "Fase 1 (MVP)"
    ),
    (
        "Keuangan & Kas",
        "Pencatatan Biaya Operasional Toko",
        "Menu Kas Keluar / Biaya di modul Akuntansi iPos. Digunakan untuk mencatat pengeluaran listrik, gaji, bensin, dll.",
        "Sistem mengurangi saldo kas/bank dan membukukan ke akun Biaya Operasional terkait. Mempengaruhi laporan Laba/Rugi.",
        "Pencatatan Pengeluaran Operasional & Klaim Sales",
        "Owner mencatat pengeluaran operasional distributor (sewa, listrik, armada). Sales di lapangan juga bisa mengajukan klaim biaya harian (BBM motor/mobil, parkir, retribusi pasar) lengkap dengan foto struk untuk diapprove owner.",
        "Fase 1 (MVP)"
    ),
    (
        "Keuangan & Kas",
        "Retur Penjualan (Barang Rusak / Expired)",
        "Modul Retur Penjualan di PC desktop. Mengembalikan stok barang yang rusak atau mengurangi saldo piutang toko yang bersangkutan.",
        "Menambah stok barang (atau memindahkan ke gudang rusak/reject) dan menerbitkan Nota Kredit yang memotong nilai faktur/piutang berjalan toko.",
        "Pengajuan Retur Toko via Mobile dengan Foto Bukti",
        "Sales saat di toko memfoto barang charm yang rusak/kemasan sobek/expired, memasukkan jumlah retur di HP. Owner menerima permintaan retur dan menentukan apakah dipotong langsung dari nota baru atau retur tukar barang.",
        "Fase 2"
    ),

    # 5. Persediaan & Stok
    (
        "Persediaan / Stok",
        "Kartu Stok & Mutasi Barang",
        "Pencatatan setiap pergerakan barang masuk (dari supplier), keluar (penjualan), retur, dan penyesuaian stok (stock opname) secara kronologis.",
        "Setiap transaksi otomatis mengupdate saldo akhir stok fisik di gudang. Admin bisa mencetak histori kartu stok per barang di PC.",
        "Kartu Stok Realtime & Stock Opname Cepat di Gudang",
        "Informasi stok fisik selalu sinkron di cloud. Owner bisa memantau sisa stok per dus/pcs kapan saja. Saat stock opname di gudang, owner/karyawan cukup scan barcode via kamera HP untuk mencocokkan stok fisik.",
        "Fase 1 (MVP)"
    ),
    (
        "Persediaan / Stok",
        "Pembelian dari Supplier (Principal/Distributor Utama)",
        "Modul PO (Purchase Order) dan Faktur Pembelian di PC. Digunakan saat BumiAyu kulakan produk Charm dari pabrik/grosir besar.",
        "Menambah saldo stok gudang, mencatat utang dagang BumiAyu ke supplier, dan memperbarui harga pokok pembelian (HPP).",
        "Pencatatan Pembelian Supplier & Penerimaan Stok Barang",
        "Pencatatan PO dan nota pembelian dari supplier besar. Begitu barang datang di gudang, owner konfirmasi penerimaan dan stok langsung bertambah serta utang dagang tercatat.",
        "Fase 2"
    ),

    # 6. Akses & Otentikasi
    (
        "Akses & Keamanan",
        "Hak Akses User & Multi-User Lokal",
        "User group management di iPos (Admin, Kasir, Supervisor). Terbatas di jaringan LAN lokal kantor atau lewat IP Public / Hamachi VPN.",
        "Menggunakan database PostgreSQL lokal. Kelemahan: koneksi jarak jauh via internet sering lambat, rawan database corrupt jika listrik padam atau kabel LAN terputus.",
        "Autentikasi Cloud Terisolasi (Role: Sales & Owner)",
        "Berbasis Web & PWA modern dengan NextAuth / Supabase Auth. Sales hanya bisa melihat toko binaannya dan input order (tidak bisa lihat margin keuntungan atau data keuangan). Owner memiliki akses penuh dan analitik keuntungan.",
        "Fase 1 (MVP)"
    )
]

current_row = 5
for idx, item in enumerate(data_fitur, start=1):
    kategori, ipos_fitur, ipos_desc, ipos_konsep, bumi_fitur, bumi_konsep, prioritas = item
    ipos_combined_desc = f"{ipos_desc}\n\nMekanisme:\n{ipos_konsep}" 
    fill_to_use = ROW_ALT_FILL if idx % 2 == 0 else WHITE_FILL

    ws1.cell(row=current_row, column=1, value=idx).alignment = ALIGN_CENTER
    ws1.cell(row=current_row, column=2, value=kategori).alignment = ALIGN_LEFT
    ws1.cell(row=current_row, column=3, value=ipos_fitur).alignment = ALIGN_LEFT
    ws1.cell(row=current_row, column=4, value=ipos_combined_desc).alignment = ALIGN_LEFT
    ws1.cell(row=current_row, column=5, value=bumi_fitur).alignment = ALIGN_LEFT
    ws1.cell(row=current_row, column=6, value=bumi_konsep).alignment = ALIGN_LEFT
    
    p_cell = ws1.cell(row=current_row, column=7, value=prioritas)
    p_cell.alignment = ALIGN_CENTER
    if "MVP" in prioritas:
        p_cell.font = Font(name="Arial", size=10, bold=True, color="065F46")
    else:
        p_cell.font = Font(name="Arial", size=10, italic=True, color="475569")

    # Apply borders and styling
    for c in range(1, 8):
        cell = ws1.cell(row=current_row, column=c)
        cell.border = BORDER_THIN
        if c != 7 or "MVP" not in prioritas:
            cell.font = Font(name="Arial", size=10, color="1E293B")
        cell.fill = fill_to_use

    ws1.row_dimensions[current_row].height = 68
    current_row += 1


# -------------------------------------------------------------------------
# SHEET 2: Fitur Inovatif Rekomendasi (Tidak Ada di iPos 5)
# -------------------------------------------------------------------------
ws2 = wb.create_sheet(title="Fitur Rekomendasi Tambahan")
ws2.views.sheetView[0].showGridLines = True

ws2.merge_cells("A1:E1")
ws2["A1"] = "FITUR REKOMENDASI UNTUK BUMIAYU (YANG BELUM ADA DI IPOS 5)"
ws2["A1"].font = Font(name="Arial", size=14, bold=True, color="0F172A")
ws2["A1"].alignment = Alignment(horizontal="left", vertical="center")
ws2.row_dimensions[1].height = 30

ws2.merge_cells("A2:E2")
ws2["A2"] = "Fitur khusus dirancang untuk meningkatkan efisiensi operasional sales lapangan dan kontrol owner distributor"
ws2["A2"].font = Font(name="Arial", size=10, italic=True, color="475569")
ws2["A2"].alignment = Alignment(horizontal="left", vertical="center")
ws2.row_dimensions[2].height = 20

headers_ws2 = [
    ("No", 6, ALIGN_CENTER_MIDDLE),
    ("Fitur Inovatif yang Direkomendasikan", 28, ALIGN_LEFT),
    ("Keterbatasan / Kondisi di iPos 5", 30, ALIGN_LEFT),
    ("Manfaat & Nilai Tambah bagi BumiAyu", 35, ALIGN_LEFT),
    ("Konsep & Alur Teknis di Next.js PWA", 38, ALIGN_LEFT)
]

ws2.row_dimensions[4].height = 32
for col_idx, (col_name, col_width, align) in enumerate(headers_ws2, start=1):
    cell = ws2.cell(row=4, column=col_idx, value=col_name)
    cell.font = HEADER_FONT
    cell.alignment = align
    cell.border = BORDER_THIN
    cell.fill = BUMIAYU_HEADER_FILL
    ws2.column_dimensions[get_column_letter(col_idx)].width = col_width

fitur_rekomendasi = [
    (
        "Offline PWA & Background Auto-Sync",
        "iPos 5 adalah aplikasi desktop lokal. Jika memakai iPos Mobile Android, harus selalu terhubung ke server/IP Public via internet aktif. Sering error/timeout jika sinyal lemah di pelosok/pasar.",
        "Sales BumiAyu sering masuk ke pasar tradisional, gudang bawah tanah, atau pelosok desa dengan sinyal HP buruk. Fitur ini memastikan sales tetap 100% bisa input order tanpa hambatan sinyal.",
        "Menggunakan Service Worker dan IndexedDB di browser PWA. Pesanan tersimpan di memori HP. Begitu HP mendeteksi koneksi internet kembali, sistem secara otomatis mensinkronkan data ke server Supabase/Database Cloud."
    ),
    (
        "Sales GPS Check-in & Geofencing Toko",
        "iPos 5 tidak memiliki fitur pelacakan lokasi. Owner tidak tahu apakah sales benar-benar mendatangi toko pelanggan atau membuat orderan fiktif dari rumah/warung kopi.",
        "Mencegah 'order tembak' (pesanan palsu) dan memastikan kedisiplinan rute sales. Owner memiliki transparansi penuh atas kunjungan sales setiap hari.",
        "Saat sales tiba di toko, tombol 'Mulai Kunjungan / Check-in' mengambil koordinat GPS perangkat. Sistem memvalidasi radius jarak fisik sales dengan titik lokasi toko (misal radius maks 100 meter). Waktu kunjungan tercatat otomatis."
    ),
    (
        "Rekap Muatan Gudang Otomatis (Consolidated Packing List)",
        "Di iPos 5, untuk memuat barang ke mobil/motor delivery, admin harus membuka puluhan faktur satu per satu atau export Excel manual lalu membuat rumus SUM barang.",
        "Menghemat waktu 1-2 jam setiap sore/malam saat owner menyiapkan barang kiriman esok hari. Mengurangi risiko salah hitung atau barang tertinggal di gudang.",
        "Owner memilih tanggal pengiriman atau memfilter 20 faktur toko. Sistem langsung menghasilkan satu lembar ringkasan muatan: Total Dus/Lusin/Pcs per SKU Charm. Dilengkapi checklist barang saat proses loading ke mobil/motor."
    ),
    (
        "Katalog Visual Produk & Promo Otomatis",
        "iPos 5 hanya berbasis teks kode barang dan nama barang. Sangat kaku untuk sales menawarkan varian baru produk Charm kepada toko.",
        "Sales bisa memperlihatkan foto produk yang jernih, varian kemasan (Night/Day/Wing/Non-Wing), serta promo berjalan (cth: 'Beli 10 Dus Gratis 1 Renceng') yang menarik bagi pemilik toko.",
        "Tampilan grid kartu katalog di HP sales dengan badge promo aktif. Saat sales memasukkan 10 dus ke keranjang, sistem secara otomatis menambahkan item promo gratisan ke pesanan sesuai aturan yang dibuat Owner."
    ),
    (
        "Notifikasi Faktur & Surat Tagihan Otomatis via WhatsApp",
        "iPos 5 tidak terintegrasi langsung dengan WhatsApp gateway. Kirim tagihan harus screenshot nota atau export PDF lalu kirim manual via WA pribadi.",
        "Pemilik toko langsung menerima rekap pesanan resmi via WhatsApp setelah order diapprove. Mengurangi perdebatan selisih barang dan mempercepat waktu pelunasan toko.",
        "Integrasi WhatsApp API / Webhook. Begitu Owner menekan 'Approve Order', sistem mengirimkan ringkasan faktur, rincian barang, total tagihan, dan nomor rekening BumiAyu langsung ke nomor WhatsApp pemilik toko."
    ),
    (
        "Smart Credit Lock & Bypass Token",
        "Di iPos 5, peringatan limit piutang hanya muncul di komputer kasir kantor. Sales di lapangan sering tidak tahu status utang toko saat mengambil pesanan baru.",
        "Menghindari piutang macet yang menumpuk di toko tertentu. Mengedukasi sales untuk menagih piutang lama terlebih dahulu sebelum menerima order baru.",
        "Aplikasi HP sales secara otomatis menampilkan status badge toko: 'Lancar', 'Mendekati Jatuh Tempo', atau 'Terkunci'. Jika terkunci, input order dinonaktifkan. Owner dapat memberikan kode OTP/Bypass jika memberikan dispensasi khusus."
    ),
    (
        "Web-to-Dot-Matrix Direct ESC/P Printing",
        "iPos 5 memakai FastReport desktop yang memerlukan install driver printer dan setting page size continuous custom di Windows Control Panel.",
        "Owner bisa mencetak dari laptop atau PC mana saja melalui browser web tanpa harus pusing setting margin Windows yang sering bergeser saat ganti kertas continuous form.",
        "Menghasilkan raw text formatted stream dengan perintah ESC/P khusus Epson (LX-300 / LX-310). Dikirim langsung via Web Serial API, Web USB, atau micro-agent lokal sederhana, sehingga printer mencetak seketika dalam fraksi detik tanpa spooling grafis."
    ),
    (
        "Klaim Operasional Sales Berbasis Foto Struk (Expense Management)",
        "Di iPos 5, pengeluaran harus diinput manual oleh admin di komputer kantor berdasarkan nota fisik kertas yang sering hilang atau lecek di kantong sales.",
        "Memudahkan reimbursement bensin, parkir, retribusi pasar, atau tambal ban bagi sales secara transparan dan tertib administrasi.",
        "Sales mengambil foto struk SPBU atau karcis parkir langsung dari HP, mengisi nominal dan keterangan. Owner menerima notifikasi di dashboard untuk setuju (Approve) atau tolak, lalu dana kas kecil dipotong otomatis."
    )
]

current_row_2 = 5
for idx, item in enumerate(fitur_rekomendasi, start=1):
    nama_fitur, limit_ipos, manfaat, teknis = item
    fill_to_use = ROW_ALT_FILL if idx % 2 == 0 else WHITE_FILL

    ws2.cell(row=current_row_2, column=1, value=idx).alignment = ALIGN_CENTER
    ws2.cell(row=current_row_2, column=2, value=nama_fitur).alignment = ALIGN_LEFT
    ws2.cell(row=current_row_2, column=3, value=limit_ipos).alignment = ALIGN_LEFT
    ws2.cell(row=current_row_2, column=4, value=manfaat).alignment = ALIGN_LEFT
    ws2.cell(row=current_row_2, column=5, value=teknis).alignment = ALIGN_LEFT

    for c in range(1, 6):
        cell = ws2.cell(row=current_row_2, column=c)
        cell.border = BORDER_THIN
        cell.font = Font(name="Arial", size=10, color="1E293B")
        cell.fill = fill_to_use

    ws2.row_dimensions[current_row_2].height = 70
    current_row_2 += 1


# -------------------------------------------------------------------------
# SHEET 3: Solusi Teknis & Arsitektur Continuous Form di Web
# -------------------------------------------------------------------------
ws3 = wb.create_sheet(title="Panduan Cetak Continuous Form")
ws3.views.sheetView[0].showGridLines = True

ws3.merge_cells("A1:D1")
ws3["A1"] = "PANDUAN STRATEGI TEKNIS: CETAK CONTINUOUS FORM DI WEB PWA"
ws3["A1"].font = Font(name="Arial", size=14, bold=True, color="0F172A")
ws3["A1"].alignment = Alignment(horizontal="left", vertical="center")
ws3.row_dimensions[1].height = 30

ws3.merge_cells("A2:D2")
ws3["A2"] = "Solusi tantangan cetak printer dot matrix (Epson LX-310 / sejenis) pada aplikasi web Next.js"
ws3["A2"].font = Font(name="Arial", size=10, italic=True, color="475569")
ws3["A2"].alignment = Alignment(horizontal="left", vertical="center")
ws3.row_dimensions[2].height = 20

headers_ws3 = [
    ("No", 6, ALIGN_CENTER_MIDDLE),
    ("Metode Cetak", 24, ALIGN_LEFT),
    ("Kelebihan & Kekurangan", 38, ALIGN_LEFT),
    ("Rekomendasi Implementasi untuk Owner BumiAyu", 45, ALIGN_LEFT)
]

ws3.row_dimensions[4].height = 30
for col_idx, (col_name, col_width, align) in enumerate(headers_ws3, start=1):
    cell = ws3.cell(row=4, column=col_idx, value=col_name)
    cell.font = HEADER_FONT
    cell.alignment = align
    cell.border = BORDER_THIN
    cell.fill = IPOS_HEADER_FILL
    ws3.column_dimensions[get_column_letter(col_idx)].width = col_width

metode_cetak = [
    (
        "Metode 1: CSS Print Media (@page custom size)",
        "+ Sangat mudah dibuat (murni browser).\n+ Tidak perlu install aplikasi tambahan di PC Owner.\n- Tergantung driver Windows dan browser preview.\n- Cetakan berupa mode grafik sehingga jarum dot matrix bergerak lebih lambat dibanding text mode.",
        "Gunakan untuk cetak Surat Jalan / Faktur jika Owner mencetak dari laptop kantor standar. Ukuran kertas diset 9.5 x 5.5 inch (kertas continuous bagi 2) dengan CSS:\n@page { size: 215mm 140mm; margin: 0; }"
    ),
    (
        "Metode 2: Raw ESC/P via Micro Print Service / QZ Tray",
        "+ Kecepatan kilat (1 faktur selesai dalam 2-3 detik).\n+ Suara printer dot matrix khas text-mode yang awet jarumnya.\n+ Presisi garis dan perforasi sobekan kertas selalu tepat.\n- Butuh 1 utility kecil (service) yang berjalan di PC kasir yang tercolok kabel printer.",
        "SANGAT DIREKOMENDASIKAN untuk volume tinggi (cetak 50-100 faktur harian). Aplikasi Next.js mengirimkan teks mentah berformat ESC/P langsung ke port printer USB/LPT via helper lokal (Node.js agent atau QZ Tray)."
    ),
    (
        "Metode 3: Web Serial / WebUSB API (Browser Direct)",
        "+ Langsung dari Chrome / Edge tanpa software perantara.\n+ Mengirimkan string raw ESC/P langsung ke port printer USB.\n- Memerlukan izin USB port di browser setiap kali printer dinyalakan kembali.",
        "Bisa dijadikan opsi alternatif modern jika PC Owner menggunakan browser berbasis Chromium (Google Chrome / Microsoft Edge)."
    )
]

for idx, item in enumerate(metode_cetak, start=1):
    row_num = 4 + idx
    metode, plus_minus, rekomendasi = item
    fill_to_use = ROW_ALT_FILL if idx % 2 == 0 else WHITE_FILL

    ws3.cell(row=row_num, column=1, value=idx).alignment = ALIGN_CENTER
    ws3.cell(row=row_num, column=2, value=metode).alignment = ALIGN_LEFT
    ws3.cell(row=row_num, column=3, value=plus_minus).alignment = ALIGN_LEFT
    ws3.cell(row=row_num, column=4, value=rekomendasi).alignment = ALIGN_LEFT

    for c in range(1, 5):
        cell = ws3.cell(row=row_num, column=c)
        cell.border = BORDER_THIN
        cell.font = Font(name="Arial", size=10, color="1E293B")
        cell.fill = fill_to_use

    ws3.row_dimensions[row_num].height = 75

# Save workbook
file_path = "Fitur_iPos_vs_BumiAyu_PWA.xlsx"
wb.save(file_path)
print(f"Excel file successfully generated at {file_path}")
