import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedProductCatalog() {
  console.log('🌱 Seeding product catalog...');

  // Find existing warehouse (Gudang Pusat Bandung)
  const gudang = await prisma.gudang.findFirst({
    where: {
      OR: [
        { kode: 'GDG-BDG-001' },
        { nama: { contains: 'Bandung' } },
      ],
    },
  });

  if (!gudang) {
    console.error('❌ Gudang not found! Please seed warehouses first.');
    return;
  }

  console.log(`✅ Found warehouse: ${gudang.nama} (${gudang.kode})`);

  // Sample products for the catalog
  const products = [
    {
      nama: 'Beras Premium Cianjur',
      deskripsi: 'Beras kualitas premium dari Cianjur, pulen dan wangi',
      satuan: 'kg',
      hargaGudang: 15000,
      stokTersedia: 5000,
      gambarUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800',
      isActive: true,
    },
    {
      nama: 'Gula Pasir Putih',
      deskripsi: 'Gula pasir putih berkualitas tinggi',
      satuan: 'kg',
      hargaGudang: 12000,
      stokTersedia: 3000,
      gambarUrl: 'https://images.unsplash.com/photo-1587735243615-c03f25aaff15?w=800',
      isActive: true,
    },
    {
      nama: 'Minyak Goreng Curah',
      deskripsi: 'Minyak goreng kemasan curah, cocok untuk usaha kuliner',
      satuan: 'liter',
      hargaGudang: 18000,
      stokTersedia: 2000,
      gambarUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800',
      isActive: true,
    },
    {
      nama: 'Tepung Terigu Protein Tinggi',
      deskripsi: 'Tepung terigu protein tinggi untuk roti dan kue',
      satuan: 'kg',
      hargaGudang: 10000,
      stokTersedia: 4000,
      gambarUrl: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=800',
      isActive: true,
    },
    {
      nama: 'Garam Dapur Halus',
      deskripsi: 'Garam dapur halus beryodium',
      satuan: 'kg',
      hargaGudang: 5000,
      stokTersedia: 1500,
      gambarUrl: 'https://images.unsplash.com/photo-1607672632458-9eb56696346b?w=800',
      isActive: true,
    },
    {
      nama: 'Kecap Manis Kemasan Curah',
      deskripsi: 'Kecap manis kualitas premium kemasan curah',
      satuan: 'liter',
      hargaGudang: 25000,
      stokTersedia: 800,
      gambarUrl: 'https://images.unsplash.com/photo-1626200419199-391ae4be7a41?w=800',
      isActive: true,
    },
    {
      nama: 'Saus Tomat Kemasan Curah',
      deskripsi: 'Saus tomat kemasan curah untuk usaha kuliner',
      satuan: 'liter',
      hargaGudang: 22000,
      stokTersedia: 600,
      gambarUrl: 'https://images.unsplash.com/photo-1598214886806-c87b84b7078b?w=800',
      isActive: true,
    },
    {
      nama: 'Kopi Bubuk Robusta',
      deskripsi: 'Kopi bubuk robusta asli Lampung',
      satuan: 'kg',
      hargaGudang: 45000,
      stokTersedia: 500,
      gambarUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800',
      isActive: true,
    },
    {
      nama: 'Teh Celup Kemasan Bulk',
      deskripsi: 'Teh celup kemasan bulk untuk dijual eceran',
      satuan: 'box',
      hargaGudang: 35000,
      stokTersedia: 1000,
      gambarUrl: 'https://images.unsplash.com/photo-1597318130878-aa1daa41f2e6?w=800',
      isActive: true,
    },
    {
      nama: 'Susu Bubuk Full Cream',
      deskripsi: 'Susu bubuk full cream untuk minuman dan kue',
      satuan: 'kg',
      hargaGudang: 85000,
      stokTersedia: 300,
      gambarUrl: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=800',
      isActive: true,
    },
    {
      nama: 'Mentega Putih (Shortening)',
      deskripsi: 'Mentega putih untuk kue dan roti',
      satuan: 'kg',
      hargaGudang: 32000,
      stokTersedia: 400,
      gambarUrl: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=800',
      isActive: true,
    },
    {
      nama: 'Cokelat Bubuk Premium',
      deskripsi: 'Cokelat bubuk premium untuk minuman dan kue',
      satuan: 'kg',
      hargaGudang: 65000,
      stokTersedia: 250,
      gambarUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800',
      isActive: true,
    },
    {
      nama: 'Mie Instan Kemasan Karton',
      deskripsi: 'Mie instan berbagai rasa kemasan karton (40 pcs)',
      satuan: 'karton',
      hargaGudang: 120000,
      stokTersedia: 500,
      gambarUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
      isActive: true,
    },
    {
      nama: 'Bumbu Dapur Lengkap (Paket)',
      deskripsi: 'Paket bumbu dapur lengkap untuk warung',
      satuan: 'paket',
      hargaGudang: 75000,
      stokTersedia: 200,
      gambarUrl: 'https://images.unsplash.com/photo-1596040033229-a0b3b83b0c87?w=800',
      isActive: true,
    },
    {
      nama: 'Sabun Cuci Piring Kemasan Jerigen',
      deskripsi: 'Sabun cuci piring kemasan jerigen 5 liter',
      satuan: 'jerigen',
      hargaGudang: 45000,
      stokTersedia: 300,
      gambarUrl: 'https://images.unsplash.com/photo-1563299796-17596ed6b017?w=800',
      isActive: true,
    },
  ];

  console.log(`\n📦 Creating ${products.length} products...`);

  for (const product of products) {
    const created = await prisma.produkGudang.upsert({
      where: {
        // Use a composite unique constraint if available, or just create
        id: 'temp-id-' + product.nama.toLowerCase().replace(/\s+/g, '-'),
      },
      update: {},
      create: {
        gudangId: gudang.id,
        ...product,
      },
    });

    console.log(`  ✅ ${created.nama} - Rp ${created.hargaGudang.toLocaleString('id-ID')}/${created.satuan}`);
  }

  console.log(`\n✅ Successfully seeded ${products.length} products!`);
  console.log(`\n📍 Test the catalog API:`);
  console.log(`   GET http://localhost:5005/api/produk/katalog?gudangId=${gudang.id}`);
  console.log(`\n🔗 Use in seller frontend:`);
  console.log(`   http://localhost:3004/seller/pengajuan-stok/baru?gudangId=${gudang.id}`);
}

seedProductCatalog()
  .catch((e) => {
    console.error('❌ Error seeding product catalog:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
