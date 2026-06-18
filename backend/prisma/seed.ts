import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { seedBandungProducts } from './seeds/02_bandung_products';
import { seedMasterKomoditas } from './seeds/master-komoditas.seed';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Start Seeding GUDANG DB (1 gudang, 3 komoditas) ---');

  // ── 0. Bersihkan semua data lama (child → parent) ─────────────────────────
  console.log('🧹 Membersihkan seluruh data lama...');
  const safeDelete = async (label: string, fn: () => Promise<unknown>) => {
    try { await fn(); } catch (err: any) {
      console.warn(`   • skip ${label}: ${err?.message?.split('\n')[0] ?? err}`);
    }
  };
  await safeDelete('pengajuanVarian', () => (prisma as any).pengajuanVarian?.deleteMany());
  await safeDelete('konfigurasiKemasan', () => (prisma as any).konfigurasiKemasan?.deleteMany());
  await safeDelete('itemPengajuanStokKemasan', () => (prisma as any).itemPengajuanStokKemasan?.deleteMany());
  await safeDelete('itemPengajuanStok', () => (prisma as any).itemPengajuanStok?.deleteMany());
  await safeDelete('pengajuanStokToko', () => (prisma as any).pengajuanStokToko?.deleteMany());
  await safeDelete('hppProduk', () => (prisma as any).hppProduk?.deleteMany());
  await safeDelete('produkGudang', () => prisma.produkGudang.deleteMany());
  await safeDelete('masterVarian', () => (prisma as any).masterVarian?.deleteMany());
  await safeDelete('masterKomoditas', () => prisma.masterKomoditas.deleteMany());
  await safeDelete('gradingPenerimaan', () => (prisma as any).gradingPenerimaan?.deleteMany());
  await safeDelete('pemrosesanGudang', () => (prisma as any).pemrosesanGudang?.deleteMany());
  await safeDelete('penerimaanGudang', () => (prisma as any).penerimaanGudang?.deleteMany());
  await safeDelete('penjualanKeluar', () => (prisma as any).penjualanKeluar?.deleteMany());
  await safeDelete('permintaanPengadaan', () => (prisma as any).permintaanPengadaan?.deleteMany());
  await safeDelete('zonaGudang', () => (prisma as any).zonaGudang?.deleteMany());
  await safeDelete('pekerjaanBookingGudang', () => (prisma as any).pekerjaanBookingGudang?.deleteMany());
  await safeDelete('gudang', () => prisma.gudang.deleteMany());
  await safeDelete('pengguna', () => prisma.pengguna.deleteMany());
  console.log('✅ Semua data lama dibersihkan.');

  const passwordHash = await bcrypt.hash('password123', 10);

  // ── 1. Super Admin ────────────────────────────────────────────────────────
  await prisma.pengguna.upsert({
    where: { email: 'admin@agrojabar.co.id' },
    update: { kataSandi: passwordHash, nama: 'Super Admin Gudang', peran: 'SUPER_ADMIN' },
    create: {
      email:    'admin@agrojabar.co.id',
      kataSandi: passwordHash,
      nama:     'Super Admin Gudang',
      noTelepon: '081234567890',
      peran:    'SUPER_ADMIN',
    },
  });
  console.log('[SEED] Super Admin: admin@agrojabar.co.id');

  // ── 2. Akun Gudang Bandung (Kepala + Staf) ───────────────────────────────
  const kepala = await prisma.pengguna.upsert({
    where:  { email: 'kepala.gdg-bandung@agrojabar.co.id' },
    update: { kataSandi: passwordHash, nama: 'Rina Setiawan', peran: 'ADMIN_GUDANG' },
    create: {
      email:    'kepala.gdg-bandung@agrojabar.co.id',
      kataSandi: passwordHash,
      nama:     'Rina Setiawan',
      noTelepon: '0274-123456',
      peran:    'ADMIN_GUDANG',
    },
  });

  const staf = await prisma.pengguna.upsert({
    where:  { email: 'staf.gdg-bandung@agrojabar.co.id' },
    update: { kataSandi: passwordHash, nama: 'Rudi Hartono', peran: 'STAF_GUDANG' },
    create: {
      email:    'staf.gdg-bandung@agrojabar.co.id',
      kataSandi: passwordHash,
      nama:     'Rudi Hartono',
      noTelepon: '0274-123457',
      peran:    'STAF_GUDANG',
    },
  });

  console.log('[SEED] GDG-BANDUNG-001: kepala=kepala.gdg-bandung@agrojabar.co.id, staf=staf.gdg-bandung@agrojabar.co.id');

  // ── 3. Gudang Bandung (satu-satunya gudang) ───────────────────────────────
  const existing = await prisma.gudang.findUnique({ where: { kode: 'GDG-BANDUNG-001' } });
  if (!existing) {
    await prisma.gudang.create({
      data: {
        kode:             'GDG-BANDUNG-001',
        nama:             'Gudang Pusat Bandung',
        tipe:             'PUSAT',
        alamat:           'Jl. Raya Bandung No. 123, Bandung',
        kabupaten:        'Kota Bandung',
        provinsi:         'Jawa Barat',
        lat:              -6.9175,
        lng:              107.6062,
        kapasitasKg:      50000,
        telepon:          '0274-123456',
        email:            'gudang.bandung@agrojabar.com',
        jamOperasional:   '08:00 - 17:00',
        status:           'ACTIVE',
        penanggungJawabId: kepala.id,
      },
    });
    console.log('[SEED] Gudang created: Gudang Pusat Bandung');
  } else {
    await prisma.gudang.update({
      where: { kode: 'GDG-BANDUNG-001' },
      data:  { penanggungJawabId: kepala.id },
    });
    console.log('[SEED] Gudang updated: Gudang Pusat Bandung');
  }

  // ── 4. Master Komoditas ───────────────────────────────────────────────────
  await seedMasterKomoditas();

  // ── 4b. Master Varian (varian olahan yang diizinkan) ──────────────────────
  const MASTER_VARIAN = [
    { nama: 'Fresh', deskripsi: 'Produk segar tanpa proses pembekuan' },
    { nama: 'Frozen', deskripsi: 'Produk beku siap olah, daya simpan lebih lama' },
  ];
  await (prisma as any).masterVarian.deleteMany();
  for (const v of MASTER_VARIAN) {
    await (prisma as any).masterVarian.create({ data: v });
  }
  console.log(`[SEED] ${MASTER_VARIAN.length} master varian`);

  // ── 5. Produk Gudang Bandung ──────────────────────────────────────────────
  await seedBandungProducts();

  console.log('\n--- Seeding Selesai ---');
  console.log('\n📱 Test Accounts GUDANG (password: password123):');
  console.log('\n  🔑 Super Admin:');
  console.log('     admin@agrojabar.co.id');
  console.log('\n  🏭 GDG-BANDUNG-001 (Gudang Pusat Bandung):');
  console.log('     kepala.gdg-bandung@agrojabar.co.id (Kepala Gudang)');
  console.log('     staf.gdg-bandung@agrojabar.co.id   (Staf)');
}

main()
  .catch((e) => { console.error('Error during seeding:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
