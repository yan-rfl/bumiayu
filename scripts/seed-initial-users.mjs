import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Parse .env.local
const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach((line) => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
  }
});

let supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'] || '';
supabaseUrl = supabaseUrl.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const supabaseSecret = env['SUPABASE_SERVICE_ROLE_KEY'] || '';

const supabase = createClient(supabaseUrl, supabaseSecret, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('🚀 Memulai inisialisasi data akun awal BumiAyu...');
  console.log('Target Supabase:', supabaseUrl);

  // 1. Akun Admin / Owner
  const ownerUsername = 'admin';
  const ownerEmail = `${ownerUsername}@bumiayu.internal`;
  const ownerPassword = 'adminbumiayu123';

  console.log(`\n1. Membuat akun Owner: ${ownerUsername} (${ownerEmail})...`);
  let ownerId = null;

  const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Error list users:', listError.message);
  }

  const existingOwner = existingUsers?.users?.find((u) => u.email === ownerEmail);

  if (existingOwner) {
    console.log('Akun auth owner sudah ada, ID:', existingOwner.id);
    ownerId = existingOwner.id;
  } else {
    const { data: newOwner, error: createError } = await supabase.auth.admin.createUser({
      email: ownerEmail,
      password: ownerPassword,
      email_confirm: true,
      user_metadata: { username: ownerUsername, full_name: 'Owner BumiAyu', role: 'owner' },
    });

    if (createError) {
      console.error('Gagal membuat auth owner:', createError.message);
    } else {
      ownerId = newOwner.user.id;
      console.log('Berhasil membuat auth user owner. ID:', ownerId);
    }
  }

  // Masukkan ke tabel profiles
  if (ownerId) {
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: ownerId,
      username: ownerUsername,
      full_name: 'Owner BumiAyu',
      phone: '081234567890',
      role: 'owner',
      is_active: true,
    });

    if (profileError) {
      console.error('Gagal upsert profile owner:', profileError.message);
    } else {
      console.log('✅ Profil Owner berhasil disimpan di tabel profiles!');
    }
  }

  // 2. Akun Sales Perdana (sales1)
  const salesUsername = 'sales1';
  const salesEmail = `${salesUsername}@bumiayu.internal`;
  const salesPassword = 'salesbumiayu123';

  console.log(`\n2. Membuat akun Sales Perdana: ${salesUsername} (${salesEmail})...`);
  let salesId = null;

  const existingSales = existingUsers?.users?.find((u) => u.email === salesEmail);

  if (existingSales) {
    console.log('Akun auth sales sudah ada, ID:', existingSales.id);
    salesId = existingSales.id;
  } else {
    const { data: newSales, error: createSalesError } = await supabase.auth.admin.createUser({
      email: salesEmail,
      password: salesPassword,
      email_confirm: true,
      user_metadata: { username: salesUsername, full_name: 'Sales Budi Santoso', role: 'sales' },
    });

    if (createSalesError) {
      console.error('Gagal membuat auth sales:', createSalesError.message);
    } else {
      salesId = newSales.user.id;
      console.log('Berhasil membuat auth user sales. ID:', salesId);
    }
  }

  if (salesId) {
    const { error: profileSalesError } = await supabase.from('profiles').upsert({
      id: salesId,
      username: salesUsername,
      full_name: 'Sales Budi Santoso',
      phone: '089876543210',
      role: 'sales',
      is_active: true,
    });

    if (profileSalesError) {
      console.error('Gagal upsert profile sales:', profileSalesError.message);
    } else {
      console.log('✅ Profil Sales berhasil disimpan di tabel profiles!');
    }
  }

  // 3. Masukkan Sampel Master Barang Produk Charm (PCS, BD/Bendit isi 3, KTN isi 24)
  console.log('\n3. Menyiapkan master produk Charm & multi-satuan...');
  const sampleProducts = [
    {
      sku: 'CHR-NIGHT-35',
      name: 'Charm Safe Night 35cm Wing',
      category: 'Charm',
      base_unit: 'PCS',
      units: [
        { unit_name: 'PCS', conversion_qty: 1, purchase_price: 2500, price_grosir: 2900, price_ecer: 3200, is_default_sales: false },
        { unit_name: 'BD', conversion_qty: 3, purchase_price: 7500, price_grosir: 8600, price_ecer: 9500, is_default_sales: false },
        { unit_name: 'KTN', conversion_qty: 24, purchase_price: 60000, price_grosir: 68000, price_ecer: 75000, is_default_sales: true },
      ],
      initial_stock: 480, // 20 Karton
    },
    {
      sku: 'CHR-DAY-WING-23',
      name: 'Charm Body Fit Day Wing 23cm',
      category: 'Charm',
      base_unit: 'PCS',
      units: [
        { unit_name: 'PCS', conversion_qty: 1, purchase_price: 2000, price_grosir: 2300, price_ecer: 2600, is_default_sales: false },
        { unit_name: 'BD', conversion_qty: 3, purchase_price: 6000, price_grosir: 6800, price_ecer: 7600, is_default_sales: false },
        { unit_name: 'KTN', conversion_qty: 36, purchase_price: 72000, price_grosir: 81000, price_ecer: 90000, is_default_sales: true },
      ],
      initial_stock: 720, // 20 Karton
    },
  ];

  for (const prod of sampleProducts) {
    const { data: prodData, error: prodErr } = await supabase
      .from('products')
      .upsert({ sku: prod.sku, name: prod.name, category: prod.category, base_unit: prod.base_unit }, { onConflict: 'sku' })
      .select()
      .single();

    if (prodErr) {
      console.error(`Gagal insert produk ${prod.sku}:`, prodErr.message);
      continue;
    }

    const productId = prodData.id;

    // Units
    for (const u of prod.units) {
      await supabase.from('product_units').upsert(
        {
          product_id: productId,
          unit_name: u.unit_name,
          conversion_qty: u.conversion_qty,
          purchase_price: u.purchase_price,
          price_grosir: u.price_grosir,
          price_ecer: u.price_ecer,
          is_default_sales: u.is_default_sales,
        },
        { onConflict: 'product_id,unit_name' }
      );
    }

    // Stok Fisik
    await supabase.from('inventory_stocks').upsert({
      product_id: productId,
      stock_base_unit: prod.initial_stock,
      minimum_stock_alert: 60,
    });

    // Snapshot H-1
    const today = new Date().toISOString().split('T')[0];
    await supabase.from('inventory_snapshots').upsert(
      {
        snapshot_date: today,
        product_id: productId,
        stock_base_unit: prod.initial_stock,
      },
      { onConflict: 'snapshot_date,product_id' }
    );
  }
  console.log('✅ Master produk & stok awal berhasil disiapkan!');

  // 4. Masukkan Sampel Toko
  console.log('\n4. Menyiapkan sampel master toko & zonasi wilayah...');
  const sampleStores = [
    {
      code: 'TK-001',
      name: 'Toko Berkah Sejahtera',
      owner_name: 'Haji Mansur',
      phone_wa: '08123456781',
      address: 'Jl. Pasar Wage No. 12, Bumiayu',
      zone_code: 'Z-PASAR-WAGE',
      top_days: 0, // Cash / Tunai 0-day
      credit_limit: 0,
      current_debt: 0,
    },
    {
      code: 'TK-002',
      name: 'Toko Subur Makmur',
      owner_name: 'Koh Akwang',
      phone_wa: '08123456782',
      address: 'Jl. Raya Diponegoro No. 45, Bumiayu',
      zone_code: 'Z-KOTA-DIPONEGORO',
      top_days: 7, // Tempo 7 hari
      credit_limit: 5000000,
      current_debt: 0,
    },
    {
      code: 'TK-003',
      name: 'Minimarket Barokah',
      owner_name: 'Ibu Siti',
      phone_wa: '08123456783',
      address: 'Jl. Lingkar Luar No. 8, Bumiayu',
      zone_code: 'Z-LINGKAR-SELATAN',
      top_days: 14, // Tempo 14 hari
      credit_limit: 10000000,
      current_debt: 0,
    },
  ];

  for (const s of sampleStores) {
    await supabase.from('stores').upsert(s, { onConflict: 'code' });
  }
  console.log('✅ Master toko percontohan berhasil disiapkan!');

  console.log('\n🎉 Selesai! Semua data awal berhasil diinisialisasi ke Supabase.');
}

main().catch(console.error);
