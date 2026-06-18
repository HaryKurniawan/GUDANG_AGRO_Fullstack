import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PRODUK_BANDUNG: { nama: string; varian?: string; hargaGudang: number; stok: number; deskripsi: string }[] = [
  { nama: 'Wortel', varian: 'Frozen', hargaGudang: 13000, stok: 1000, deskripsi: 'Wortel beku siap olah' },
  { nama: 'Buncis', varian: 'Frozen', hargaGudang: 11000, stok: 1000, deskripsi: 'Buncis beku siap olah' },
  { nama: 'Jagung', varian: 'Frozen', hargaGudang: 10000, stok: 1000, deskripsi: 'Jagung manis beku siap olah' },
];

export async function seedBandungProducts() {
  console.log('🛒 Seeding produk Gudang Bandung (3 komoditas varian Frozen)...');

  await prisma.produkGudang.deleteMany();

  const gudang = await prisma.gudang.findUnique({ where: { kode: 'GDG-BANDUNG-001' } });
  if (!gudang) {
    console.warn('  ⚠ Gudang GDG-BANDUNG-001 tidak ditemukan, skip produk.');
    return;
  }

  let created = 0;
  for (const prod of PRODUK_BANDUNG) {
    const master = await prisma.masterKomoditas.findFirst({ where: { nama: prod.nama } });
    const varianVal = prod.varian ? prod.varian.trim() : null;

    await prisma.produkGudang.create({
      data: {
        gudangId:          gudang.id,
        masterKomoditasId: master?.id ?? null,
        nama:              prod.nama,
        varianProduk:      varianVal,
        deskripsi:         prod.deskripsi,
        satuan:            master?.satuan ?? 'kg',
        hargaGudang:       prod.hargaGudang,
        stok:              prod.stok,
        gambarUrl:         master?.gambarUrl ?? null,
        isActive:          true,
      },
    });
    created++;
  }
  console.log(`  ✓ Gudang Pusat Bandung (GDG-BANDUNG-001): ${created} produk`);
}

if (require.main === module) {
  seedBandungProducts()
    .then(() => { console.log('✅ Selesai'); process.exit(0); })
    .catch((e) => { console.error('❌', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
}
