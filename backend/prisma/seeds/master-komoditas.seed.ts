import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MASTER_KOMODITAS_DATA = [
  {
    nama: 'Wortel',
    kodeKomoditasGlobal: 'WORTEL',
    kategori: 'Sayuran',
    satuan: 'kg',
    harga: 10000,
    deskripsi: 'Wortel segar berkualitas tinggi',
    gambarUrl: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600&q=80',
  },
  {
    nama: 'Buncis',
    kodeKomoditasGlobal: 'BUNCIS',
    kategori: 'Sayuran',
    satuan: 'kg',
    harga: 8000,
    deskripsi: 'Buncis muda segar dari petani',
    gambarUrl: 'https://images.unsplash.com/photo-1583091931818-406c7e289ec0?w=600&q=80',
  },
  {
    nama: 'Jagung',
    kodeKomoditasGlobal: 'JAGUNG_MANIS',
    kategori: 'Sayuran',
    satuan: 'kg',
    harga: 7000,
    deskripsi: 'Jagung manis segar',
    gambarUrl: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600&q=80',
  },
];

export async function seedMasterKomoditas() {
  console.log('🌱 Seeding Master Komoditas (3 komoditas)...');

  await prisma.masterKomoditas.deleteMany();

  for (const komoditas of MASTER_KOMODITAS_DATA) {
    await prisma.masterKomoditas.create({ data: komoditas });
  }

  const count = await prisma.masterKomoditas.count();
  console.log(`  ✓ ${count} master komoditas`);
}

if (require.main === module) {
  seedMasterKomoditas()
    .then(() => { console.log('✅ Selesai'); process.exit(0); })
    .catch((e) => { console.error('❌', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
}
